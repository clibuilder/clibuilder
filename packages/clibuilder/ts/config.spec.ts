import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { baseline, execCommand } from '@unional/fixture'
import { loadConfig } from './config.js'

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

describe('loadConfig() lookup', () => {
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
