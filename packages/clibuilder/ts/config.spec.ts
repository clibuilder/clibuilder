import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { baseline, execCommand } from '@unional/fixture'
import {
	getConfigFilenames,
	getConfigFormat,
	loadConfig,
	lookupConfig,
	readConfigFile,
	resolveConfig
} from './config.js'

baseline(
	{
		basePath: 'fixtures',
		casesFolder: '.',
		// filter: /has-rc-config/,
		filter: /has-.*-config/,
		suppressFilterWarnings: true
	},
	({ caseName, casePath }) => {
		test(caseName, async () => {
			const { stdout, stderr } = await execCommand({ casePath, command: 'node', args: ['bin.js'] })
			if (stderr) console.info('stderr', stderr)
			expect(stdout).toEqual('{"a":1}')
		})
	}
)

const ui = { info() {}, debug() {}, warn() {} }
const roots: string[] = []

// each case uses its own config name so nothing above `tmpdir()` can match
let counter = 0
function nextConfigName() {
	return `clibuilder-spec-${process.pid}-${counter++}`
}

/**
 * Creates `<root>/a/b/c` and writes each entry of `files` relative to `root`.
 * Returns the root and the deepest directory to look up from.
 */
function scaffold(files: Record<string, string>) {
	const root = mkdtempSync(join(tmpdir(), 'clibuilder-config-'))
	roots.push(root)
	const cwd = join(root, 'a', 'b', 'c')
	mkdirSync(cwd, { recursive: true })
	// a `package.json` at the root stops the `package.json` fallback from escaping the scaffold
	writeFileSync(join(root, 'package.json'), '{}')
	for (const [name, content] of Object.entries(files)) {
		writeFileSync(join(root, name), content)
	}
	return { root, cwd }
}

afterAll(() => {
	for (const root of roots) rmSync(root, { recursive: true, force: true })
})

describe('loadConfig() lookup', () => {
	it('finds the config in an ancestor directory', async () => {
		const name = nextConfigName()
		const { cwd } = scaffold({ [`${name}.json`]: '{"from":"root"}' })

		expect(await loadConfig({ cwd, ui }, name)).toEqual({ from: 'root' })
	})

	it('finds the dot-prefixed config', async () => {
		const name = nextConfigName()
		const { cwd } = scaffold({ [`.${name}rc.json`]: '{"from":"dot-rc"}' })

		expect(await loadConfig({ cwd, ui }, name)).toEqual({ from: 'dot-rc' })
	})

	it('picks the nearest directory, even when a farther one has a higher priority name', async () => {
		// `<name>.json` outranks `<name>.yaml` in the candidate list, but `a/b` is nearer than the root.
		// Previously each candidate was searched to the root in turn, so the root's `.json` won.
		const name = nextConfigName()
		const { root, cwd } = scaffold({ [`${name}.json`]: '{"from":"root"}' })
		writeFileSync(join(root, 'a', 'b', `${name}.yaml`), 'from: nearest')

		expect(await loadConfig({ cwd, ui }, name)).toEqual({ from: 'nearest' })
	})

	it('picks by candidate order within a directory', async () => {
		const name = nextConfigName()
		const { root, cwd } = scaffold({})
		writeFileSync(join(root, 'a', `${name}.yaml`), 'from: yaml')
		writeFileSync(join(root, 'a', `${name}.json`), '{"from":"json"}')

		expect(await loadConfig({ cwd, ui }, name)).toEqual({ from: 'json' })
	})

	it('follows a symlink pointing at a config file', async () => {
		const name = nextConfigName()
		const { root, cwd } = scaffold({ 'actual-config.json': '{"from":"symlink"}' })
		symlinkSync(join(root, 'actual-config.json'), join(root, 'a', `${name}.json`))

		expect(await loadConfig({ cwd, ui }, name)).toEqual({ from: 'symlink' })
	})

	it('ignores a directory named like a config file', async () => {
		const name = nextConfigName()
		const { root, cwd } = scaffold({ [`${name}.json`]: '{"from":"root"}' })
		mkdirSync(join(root, 'a', `${name}.yaml`))

		expect(await loadConfig({ cwd, ui }, name)).toEqual({ from: 'root' })
	})

	it('falls back to the package.json entry when no config file is found', async () => {
		const name = nextConfigName()
		const { root, cwd } = scaffold({})
		writeFileSync(join(root, 'package.json'), JSON.stringify({ [name]: { from: 'pjson' } }))

		expect(await loadConfig({ cwd, ui }, name)).toEqual({ from: 'pjson' })
	})

	it('returns undefined when there is no config anywhere', async () => {
		const name = nextConfigName()
		const { cwd } = scaffold({})

		expect(await loadConfig({ cwd, ui }, name)).toBeUndefined()
	})
})

describe('jsonc config (#341)', () => {
	it('parses a `.jsonc` file with line and block comments and a trailing comma', async () => {
		const name = nextConfigName()
		const { cwd } = scaffold({
			[`${name}.jsonc`]: '{\n\t// a line comment\n\t/* a block comment */\n\t"a": 1,\n}'
		})

		expect(await loadConfig({ cwd, ui }, name)).toEqual({ a: 1 })
	})

	it('parses comments in a `.json` file too', async () => {
		const name = nextConfigName()
		const { cwd } = scaffold({ [`${name}.json`]: '{\n\t// a line comment\n\t"a": 1\n}' })

		expect(await loadConfig({ cwd, ui }, name)).toEqual({ a: 1 })
	})

	it('parses comments in an extension-less rc file', async () => {
		const name = nextConfigName()
		const { cwd } = scaffold({ [`.${name}rc`]: '{\n\t// a line comment\n\t"a": 1\n}' })

		expect(await loadConfig({ cwd, ui }, name)).toEqual({ a: 1 })
	})

	// a regex-based comment stripper truncates this value at the `//` of the url
	it('does not treat a comment-like sequence inside a string as a comment', async () => {
		const name = nextConfigName()
		const { cwd } = scaffold({ [`${name}.jsonc`]: '{ "a": "http://example.com/x" /* trailing */ }' })

		expect(await loadConfig({ cwd, ui }, name)).toEqual({ a: 'http://example.com/x' })
	})

	it('offers `.jsonc` and `rc.jsonc` as candidates, dot-prefixed too', () => {
		const candidates = getConfigFilenames('my-cli')

		expect(candidates).toContain('my-cli.jsonc')
		expect(candidates).toContain('.my-cli.jsonc')
		expect(candidates).toContain('my-clirc.jsonc')
		expect(candidates).toContain('.my-clirc.jsonc')
	})

	it('reports the file that failed instead of parsing it into an empty object', async () => {
		const name = nextConfigName()
		const { root } = scaffold({ [`${name}.json`]: '{ this is not json at all' })

		await expect(readConfigFile(join(root, `${name}.json`))).rejects.toThrow(/Unable to parse .* as JSON/)
	})

	it.each([
		['a.json', 'jsonc'],
		['a.jsonc', 'jsonc'],
		['a.yml', 'yaml'],
		['a.yaml', 'yaml'],
		['a.js', 'module'],
		['a.cjs', 'module'],
		['a.mjs', 'module'],
		['.my-clirc', 'unknown']
	])('%s is parsed as %s', (path, format) => {
		expect(getConfigFormat(path)).toEqual(format)
	})
})

describe('lookupConfig() provenance (#488)', () => {
	it('reports the matched file and its format without reading it', () => {
		const name = nextConfigName()
		const { root, cwd } = scaffold({ [`${name}.jsonc`]: '{"a":1}' })

		expect(lookupConfig({ cwd }, name).source).toEqual({
			type: 'file',
			path: join(root, `${name}.jsonc`),
			format: 'jsonc'
		})
	})

	it('reports the package.json fallback and the property it read', () => {
		const name = nextConfigName()
		const { root, cwd } = scaffold({})
		writeFileSync(join(root, 'package.json'), JSON.stringify({ [name]: { a: 1 } }))

		expect(lookupConfig({ cwd }, name).source).toEqual({
			type: 'package.json',
			path: join(root, 'package.json'),
			property: name
		})
	})

	it('reports `none` when nothing matched', () => {
		const name = nextConfigName()
		const { cwd } = scaffold({})

		expect(lookupConfig({ cwd }, name).source).toEqual({ type: 'none' })
	})

	it('reports the candidates it searched for', () => {
		const name = nextConfigName()
		const { cwd } = scaffold({})

		expect(lookupConfig({ cwd }, name).candidates).toEqual(getConfigFilenames(name))
	})
})

describe('resolveConfig() (#488)', () => {
	it('returns the config together with the file it came from', async () => {
		const name = nextConfigName()
		const { root, cwd } = scaffold({ [`${name}.json`]: '{"a":1}' })

		expect(await resolveConfig({ cwd, ui }, name)).toEqual({
			config: { a: 1 },
			source: { type: 'file', path: join(root, `${name}.json`), format: 'jsonc' },
			candidates: getConfigFilenames(name)
		})
	})

	it('returns the config together with the package.json it came from', async () => {
		const name = nextConfigName()
		const { root, cwd } = scaffold({})
		writeFileSync(join(root, 'package.json'), JSON.stringify({ [name]: { a: 1 } }))

		const { config, source } = await resolveConfig({ cwd, ui }, name)
		expect(config).toEqual({ a: 1 })
		expect(source).toEqual({ type: 'package.json', path: join(root, 'package.json'), property: name })
	})

	it('returns an undefined config with a `none` source when nothing matched', async () => {
		const name = nextConfigName()
		const { cwd } = scaffold({})

		const { config, source } = await resolveConfig({ cwd, ui }, name)
		expect(config).toBeUndefined()
		expect(source).toEqual({ type: 'none' })
	})
})
