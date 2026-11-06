import { Writable } from 'node:stream'
import { cli, command } from 'clibuilder'
import { testCommand } from 'clibuilder/testing'
import { plugins } from '../plugins.js'
import { pluginsCommand } from './group.js'
import { listPluginsCommand } from './list.js'
import { searchPluginsCommand } from './search.js'

/**
 * The prose and json reports these commands log through `ui` are their `output: 'console'` rendering.
 * Their answers in the default `axi` output are specified under 'plugins list and search under output axi'.
 */
const consoleOutput = { output: 'console' } as const

describe('pluginsCommand', () => {
	test('groups list and search under plugins', async () => {
		const { messages } = await testCommand(pluginsCommand({ keywords: ['plugin-cli-plugin'] }), 'plugins --help')
		expect(messages).toContain('list')
		expect(messages).toContain('search')
	})

	test('looks for the keywords it is given', async () => {
		const { messages } = await testCommand(
			pluginsCommand({ keywords: ['plugin-cli-plugin'] }),
			'plugins list',
			consoleOutput
		)
		expect(messages).toContain('plugins: 0 installed plugins found with keywords: plugin-cli-plugin')
	})
})

describe('listPluginsCommand', () => {
	// the found names never come from the real dependency tree here: `findByKeywords` walks
	// whatever is installed next to the cli, which is not something a test can pin down.
	function list(line: string, installed: string[] = [], keywords: string[] = ['plugin-cli-plugin']) {
		return testCommand(
			{ ...listPluginsCommand(keywords), context: { findByKeywords: () => Promise.resolve(installed) } },
			line,
			consoleOutput
		)
	}

	test('reports the installed plugins as toon by default', async () => {
		const ctx = await list('list', ['pkg-x', 'pkg-y'])

		expect(ctx.messages).toContain('plugins[2]: pkg-x,pkg-y')
	})

	test('keeps the same shape for a single plugin', async () => {
		const ctx = await list('list', ['pkg-x'])

		expect(ctx.messages).toContain('plugins[1]: pkg-x')
	})

	test('states the empty result as nothing installed, not nothing published', async () => {
		const ctx = await list('list', [], ['keyword-a', 'keyword-b'])

		const msg = ctx.messages
		expect(msg).toContain('plugins: 0 installed plugins found with keywords: keyword-a, keyword-b')
		expect(msg).toContain('help[1]: Run `plugins search` to find plugins to install')
	})

	test('suggests the registry when plugins are already installed', async () => {
		const ctx = await list('list', ['pkg-x'])

		expect(ctx.messages).toContain('help[1]: Run `plugins search` to find more plugins on npm')
	})

	test('quotes plugin names that would read as two toon entries', async () => {
		const ctx = await list('list', ['@scope/pkg-x', 'odd,name'])

		expect(ctx.messages).toContain('plugins[2]: @scope/pkg-x,"odd,name"')
	})

	test('returns the found plugins, whatever the format', async () => {
		expect((await list('list', ['pkg-x', 'pkg-y'])).result).toEqual(['pkg-x', 'pkg-y'])
		expect((await list('list --format json', ['pkg-x'])).result).toEqual(['pkg-x'])
		expect((await list('list', [])).result).toEqual([])
	})

	test('--format text keeps the human-readable prose', async () => {
		const ctx = await list('list --format text', ['pkg-x', 'pkg-y'])

		expect(ctx.messages).toContain(`found the following plugins:

  pkg-x
  pkg-y`)
	})

	test('--format text reports one plugin and none in prose', async () => {
		const one = await list('list --format text', ['pkg-x'])
		expect(one.messages).toContain('found one plugin: pkg-x')

		const none = await list('list --format text', [])
		expect(none.messages).toContain('no plugin with keywords: plugin-cli-plugin')
	})

	test('--format json emits the payload alone, so it survives a pipe', async () => {
		const ctx = await list('list --format json', ['pkg-x', 'pkg-y'])

		const msg = ctx.messages
		expect(msg).toContain(`{
  "plugins": [
    "pkg-x",
    "pkg-y"
  ]
}`)
		expect(msg).not.toContain('help[1]')
	})

	test('--format json states the empty result as data', async () => {
		const ctx = await list('list --format json', [])

		expect(ctx.messages).toContain('"plugins": []')
	})

	test('rejects an unknown --format value as a usage error', async () => {
		const ctx = await list('list --format yaml', ['pkg-x'])

		const msg = ctx.messages
		expect(msg).toContain('invalid value for option --format')
		expect(msg).not.toContain('plugins[')
		expect(ctx.exitCode).toBe(2)
	})
})

describe('searchPluginsCommand', () => {
	test('no plugin', async () => {
		const ctx = await testCommand(
			{ ...searchPluginsCommand(['plugin-cli-plugin']), context: { searchByKeywords: () => Promise.resolve([]) } },
			'search',
			consoleOutput
		)

		expect(ctx.messages).toContain('packages: 0 packages found with keywords: plugin-cli-plugin')
	})

	test('one plugin', async () => {
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['plugin-cli']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x']) }
			},
			'search',
			consoleOutput
		)

		expect(ctx.messages).toContain('packages[1]: pkg-x')
	})

	test('two plugins', async () => {
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['plugin-cli']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x', 'pkg-y']) }
			},
			'search',
			consoleOutput
		)

		expect(ctx.messages).toContain('packages[2]: pkg-x,pkg-y')
	})

	test('suggests the next command when packages are found', async () => {
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['plugin-cli-plugin']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x']) }
			},
			'search',
			consoleOutput
		)

		expect(ctx.messages).toContain('help[1]: Run `plugins list` to see which of them are installed')
	})

	test('quotes package names containing the toon delimiter', async () => {
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['plugin-cli-plugin']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['@scope/pkg-x', 'odd,name']) }
			},
			'search',
			consoleOutput
		)

		expect(ctx.messages).toContain('packages[2]: @scope/pkg-x,"odd,name"')
	})

	test('escapes quotes and backslashes in package names', async () => {
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['plugin-cli-plugin']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['odd"name', 'trailing\\']) }
			},
			'search',
			consoleOutput
		)

		// a hand-escaped trailing backslash would escape the closing quote and merge the entries
		expect(ctx.messages).toContain('packages[2]: "odd\\"name","trailing\\\\"')
	})

	test('searches each keyword separately and unions the results', async () => {
		const calls: string[][] = []
		const found: Record<string, string[]> = {
			'keyword-a': ['pkg-a', 'pkg-shared'],
			'keyword-b': ['pkg-shared', 'pkg-b']
		}
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['keyword-a', 'keyword-b']),
				context: {
					searchByKeywords: (keywords: string[]) => {
						calls.push(keywords)
						return Promise.resolve(keywords.flatMap((k) => found[k] ?? []))
					}
				}
			},
			'search',
			consoleOutput
		)

		expect(calls).toEqual([['keyword-a'], ['keyword-b']])
		expect(ctx.messages).toContain('packages[3]: pkg-a,pkg-shared,pkg-b')
	})

	test('--format text keeps the human-readable prose', async () => {
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['plugin-cli-plugin']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x', 'pkg-y']) }
			},
			'search --format text',
			consoleOutput
		)

		expect(ctx.messages).toContain(`found the following packages:

  pkg-x
  pkg-y`)
	})

	test('--format text reports one package and none in prose', async () => {
		const one = await testCommand(
			{
				...searchPluginsCommand(['plugin-cli-plugin']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x']) }
			},
			'search --format text',
			consoleOutput
		)
		expect(one.messages).toContain('found one package: pkg-x')

		const none = await testCommand(
			{ ...searchPluginsCommand(['plugin-cli-plugin']), context: { searchByKeywords: () => Promise.resolve([]) } },
			'search --format text',
			consoleOutput
		)
		expect(none.messages).toContain('no package with keywords: plugin-cli-plugin')
	})

	test('--format json emits the payload alone, so it survives a pipe', async () => {
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['plugin-cli-plugin']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x', 'pkg-y']) }
			},
			'search --format json',
			consoleOutput
		)

		const msg = ctx.messages
		expect(msg).toContain(`{
  "packages": [
    "pkg-x",
    "pkg-y"
  ]
}`)
		expect(msg).not.toContain('help[1]')
	})

	test('--format json states the empty result as data', async () => {
		const ctx = await testCommand(
			{ ...searchPluginsCommand(['plugin-cli-plugin']), context: { searchByKeywords: () => Promise.resolve([]) } },
			'search --format json',
			consoleOutput
		)

		expect(ctx.messages).toContain('"packages": []')
	})

	describe('--fields keywords', () => {
		// `pkg-a` matches only the first keyword, `pkg-b` only the second, `pkg-both` carries both.
		const mixed: Record<string, string[]> = {
			'keyword-a': ['pkg-a', 'pkg-both'],
			'keyword-b': ['pkg-both', 'pkg-b']
		}
		const searchMixed = (keywords: string[]) => Promise.resolve(keywords.flatMap((k) => mixed[k] ?? []))

		async function search(line: string) {
			const { messages } = await testCommand(
				{ ...searchPluginsCommand(['keyword-a', 'keyword-b']), context: { searchByKeywords: searchMixed } },
				line,
				consoleOutput
			)
			return messages
		}

		test('reports which keyword found each package as a toon table', async () => {
			expect(await search('search --fields keywords')).toContain(`packages[3]{name,keywords}:
  pkg-a,keyword-a
  pkg-both,keyword-a keyword-b
  pkg-b,keyword-b`)
		})

		test('naming `name` alongside it is a no-op, not an error', async () => {
			expect(await search('search --fields name,keywords')).toContain('packages[3]{name,keywords}:')
		})

		test('stays a flat array when the field is not asked for', async () => {
			expect(await search('search')).toContain('packages[3]: pkg-a,pkg-both,pkg-b')
		})

		test('annotates the prose in --format text', async () => {
			expect(await search('search --format text --fields keywords')).toContain(`  pkg-a (keyword-a)
  pkg-both (keyword-a, keyword-b)
  pkg-b (keyword-b)`)
		})

		test('turns the json payload into objects', async () => {
			expect(await search('search --format json --fields keywords')).toContain(`{
      "name": "pkg-both",
      "keywords": [
        "keyword-a",
        "keyword-b"
      ]
    }`)
		})

		test('rejects an unknown field instead of silently dropping it', async () => {
			const msg = await search('search --fields author')
			expect(msg).toContain('error: unknown value for --fields: author')
			expect(msg).toContain('help[1]: The only extra field is `keywords`')
			expect(msg).not.toContain('packages[')
		})
	})

	test('reports zero with every keyword when no keyword matches', async () => {
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['keyword-a', 'keyword-b']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve([]) }
			},
			'search',
			consoleOutput
		)

		expect(ctx.messages).toContain('packages: 0 packages found with keywords: keyword-a, keyword-b')
	})
})

describe('the plugins commands and the global --format of clibuilder', () => {
	function memoryStream() {
		const stream = new Writable({
			decodeStrings: false,
			write(chunk, _encoding, callback) {
				stream.text += chunk
				callback()
			}
		}) as Writable & { text: string }
		stream.text = ''
		return stream
	}

	async function run(options: Partial<cli.Options>, args: string[]) {
		const stdout = memoryStream()
		const stderr = memoryStream()
		await cli({ name: 'app', version: '1.0.0', streams: { stdout, stderr }, ...options })
			.use(plugins({ keywords: ['app-plugin'], config: false }))
			.parse(['node', 'app', ...args])
		return stdout.text + stderr.text
	}

	afterEach(() => {
		process.exitCode = undefined
	})

	test.each([
		['the default output', {}],
		['output axi', { output: 'axi' }],
		['output console', { output: 'console' }],
		['cli({ format })', { format: 'toon' }]
	] as const)('give way to the global --format under %s, without a conflict', async (_, options) => {
		const help = await run(options, ['plugins', 'list', '--help'])
		expect(help).not.toContain('--format')
		const out = await run(options, ['plugins', 'list', '--format', 'json'])
		expect(process.exitCode).toBeUndefined()
		// the installed plugins, or the empty state naming them, reported in json
		expect(out).toMatch(/^\{\s*"(plugins|empty)"/)
	})

	// clibuilder 12 declares the global --format in every cli, so the commands never keep their own
	test('give way to the global --format in the console output too, so their help lists no --format of their own', async () => {
		const help = await run({ output: 'console' }, ['plugins', 'list', '--help'])
		expect(help).toContain('Usage: app plugins list')
		expect(help).not.toContain('--format')
	})

	test('read this.format when their own option gives way', async () => {
		const reported: unknown[] = []
		const list = listPluginsCommand(['app-plugin'])
		const stdout = memoryStream()
		await cli({ name: 'app', version: '1.0.0', output: 'axi', streams: { stdout, stderr: stdout } })
			.command({
				...list,
				context: { findByKeywords: () => Promise.resolve(['pkg-x']) },
				run(args) {
					reported.push(args.format)
					return (list as any).run.call(this, args)
				}
			})
			.parse(['node', 'app', 'list', '--format', 'json'])
		expect(reported).toEqual([undefined])
		expect(stdout.text).toContain('{"plugins":["pkg-x"]')
	})
})

describe('plugins list and search under output axi', () => {
	function memoryStream() {
		const stream = new Writable({
			decodeStrings: false,
			write(chunk, _encoding, callback) {
				stream.text += chunk
				callback()
			}
		}) as Writable & { text: string }
		stream.text = ''
		return stream
	}

	async function run(command: any, args: string, options: Partial<cli.Options> = { output: 'axi' }) {
		const stdout = memoryStream()
		const stderr = memoryStream()
		const value = await cli({ name: 'app', version: '1.0.0', streams: { stdout, stderr }, ...options })
			.command(command)
			.parse(['node', 'app', ...args.split(' ')])
		return { value, stdout: stdout.text, stderr: stderr.text, exitCode: process.exitCode }
	}

	type Found = { installed?: string[]; found?: string[] | Error }

	// the `plugins` group with the npm lookups replaced, so `list` and `search` have their siblings
	function group({ installed = [], found = [] }: Found = {}) {
		const findByKeywords = () => Promise.resolve(installed)
		const searchByKeywords = () => (found instanceof Error ? Promise.reject(found) : Promise.resolve(found))
		const builtin = pluginsCommand({ keywords: ['kw-a'] })
		return {
			...builtin,
			context: { findByKeywords },
			commands: builtin.commands!.map((c) => ({ ...c, context: { findByKeywords, searchByKeywords } }))
		}
	}
	const names = (n: number) => Array.from({ length: n }, (_, i) => `pkg-${i + 1}`)

	afterEach(() => {
		process.exitCode = undefined
	})

	test.each([
		['toon', 'plugins[2]: pkg-x,pkg-y\nhelp[1]: Run `app plugins search` to find more plugins on npm\n'],
		['json', '{"plugins":["pkg-x","pkg-y"],"help":["Run `app plugins search` to find more plugins on npm"]}\n'],
		[
			'text',
			'found the following plugins:\n\n  pkg-x\n  pkg-y\n\nhelp:\n  - Run `app plugins search` to find more plugins on npm\n'
		]
	] as const)('plugins list prints the installed plugins once on stdout in %s', async (format, expected) => {
		const r = await run(group({ installed: ['pkg-x', 'pkg-y'] }), `plugins list --format ${format}`)
		expect(r.stdout).toBe(expected)
		expect(r.stderr).toBe('')
		expect(r.value).toEqual({ plugins: ['pkg-x', 'pkg-y'] })
	})

	test('plugins list states nothing installed as an empty state, offering the search', async () => {
		const r = await run(group(), 'plugins list --format json')
		expect(r.stdout).toBe(
			'{"empty":"0 installed plugins found with keywords: kw-a","help":["Run `app plugins search` to find plugins to install"]}\n'
		)
		expect(r.exitCode).toBeUndefined()
	})

	test('plugins list offers no search when it is added without its group', async () => {
		const list = { ...listPluginsCommand(['kw-a']), context: { findByKeywords: () => Promise.resolve([]) } }
		const r = await run(list, 'list --format json')
		expect(r.stdout).toBe('{"empty":"0 installed plugins found with keywords: kw-a"}\n')
	})

	test('plugins list cuts a long list, counts it, and offers --full', async () => {
		const r = await run(group({ installed: names(25) }), 'plugins list --format json')
		expect(JSON.parse(r.stdout)).toEqual({
			plugins: names(20),
			count: '20 of 25 total',
			help: [
				'Run `app plugins list --full` to list every installed plugin',
				'Run `app plugins search` to find more plugins on npm'
			]
		})
		const full = await run(group({ installed: names(25) }), 'plugins list --full --format json')
		expect(JSON.parse(full.stdout).plugins).toEqual(names(25))
		expect(JSON.parse(full.stdout).count).toBeUndefined()
	})

	test('plugins list says how much it showed in text', async () => {
		const r = await run(group({ installed: names(21) }), 'plugins ls --format text')
		expect(r.stdout).toContain('  pkg-20\n\nshowing 20 of 21 total\n\nhelp:\n')
	})

	test('plugins search prints the found packages once on stdout', async () => {
		const r = await run(group({ found: ['pkg-x'] }), 'plugins search')
		expect(r.stdout).toBe('packages[1]: pkg-x\nhelp[1]: Run `app plugins list` to see which of them are installed\n')
		expect(r.stderr).toBe('')
	})

	test('plugins search writes the keywords as a table in toon, the json shape unchanged', async () => {
		const r = await run(group({ found: ['pkg-x'] }), 'plugins search --fields keywords')
		expect(r.stdout).toBe(
			'packages[1]{name,keywords}:\n  pkg-x,kw-a\n\nhelp[1]: Run `app plugins list` to see which of them are installed\n'
		)
		expect(r.value).toEqual({ packages: [{ name: 'pkg-x', keywords: ['kw-a'] }] })
	})

	test('plugins search renders the found packages and their keywords as prose in text', async () => {
		const r = await run(group({ found: ['pkg-x'] }), 'plugins search --fields keywords --format text')
		expect(r.stdout).toBe(
			'found one package: pkg-x (kw-a)\n\nhelp:\n  - Run `app plugins list` to see which of them are installed\n'
		)
		expect(r.value).toEqual({ packages: [{ name: 'pkg-x', keywords: ['kw-a'] }] })
	})

	test('plugins search renders the found names as prose in text', async () => {
		const r = await run(group({ found: ['pkg-x', 'pkg-y'] }), 'plugins search --format text')
		expect(r.stdout).toBe(
			'found the following packages:\n\n  pkg-x\n  pkg-y\n\nhelp:\n  - Run `app plugins list` to see which of them are installed\n'
		)
	})

	test('plugins search cuts a long list, counts it, and offers --full with the same --fields', async () => {
		const r = await run(group({ found: names(30) }), 'plugins search --fields keywords --format json')
		const answer = JSON.parse(r.stdout)
		expect(answer.packages).toHaveLength(20)
		expect(answer.count).toBe('20 of 30 total')
		expect(answer.help).toEqual([
			'Run `app plugins search --fields keywords --full` to list every package found',
			'Run `app plugins list` to see which of them are installed'
		])
		const full = await run(group({ found: names(30) }), 'plugins search --full --format json')
		expect(JSON.parse(full.stdout).packages).toEqual(names(30))
	})

	test('plugins search states nothing found as an empty state', async () => {
		const r = await run(group(), 'plugins search')
		expect(r.stdout).toBe('empty: 0 packages found with keywords: kw-a\n')
	})

	test('plugins search reports an unknown --fields value as a usage error on stdout', async () => {
		const r = await run(group(), 'plugins search --fields bogus --format json')
		expect(JSON.parse(r.stdout)).toEqual({
			error: 'unknown value for --fields: bogus',
			code: 'invalid-value',
			option: 'fields',
			value: 'bogus',
			help: [
				'The only extra field is `keywords`',
				'Run `app plugins search --fields keywords` to list each package with its keywords'
			]
		})
		expect(r.stderr).toBe('')
		expect(r.exitCode).toBe(2)
	})

	test('plugins search reports a registry it cannot reach as a coded error, not a crash', async () => {
		const r = await run(group({ found: new Error('fetch failed') }), 'plugins search --format json')
		expect(JSON.parse(r.stdout)).toEqual({
			error: 'cannot search the npm registry: fetch failed',
			code: 'registry-search-failed',
			help: ['Check that the npm registry is reachable', 'Run `app plugins search` to search again']
		})
		expect(r.stderr).toBe('')
		expect(r.exitCode).toBe(1)
	})

	test('plugins, invoked bare, shows the installed plugins followed by its own commands', async () => {
		const r = await run(group({ installed: ['pkg-x'] }), 'plugins')
		expect(r.stdout).toBe('plugins[1]: pkg-x\ncommands[2]: list,search\n')
		expect(r.exitCode).toBeUndefined()
		expect(r.value).toEqual({ plugins: ['pkg-x'], commands: ['list', 'search'] })
	})

	test('plugins, invoked bare with nothing installed, says so and offers the search', async () => {
		const r = await run(group(), 'plugins --format json')
		expect(JSON.parse(r.stdout)).toEqual({
			plugins: '0 installed plugins found with keywords: kw-a',
			commands: ['list', 'search'],
			help: ['Run `app plugins search` to find plugins to install']
		})
	})

	test('plugins, invoked bare with many installed, cuts the list and offers plugins list --full', async () => {
		const r = await run(group({ installed: names(22) }), 'plugins --format json')
		expect(JSON.parse(r.stdout)).toEqual({
			plugins: names(20),
			count: '20 of 22 total',
			commands: ['list', 'search'],
			help: ['Run `app plugins list --full` to list every installed plugin']
		})
	})

	test('plugins, invoked bare, lists a sub-command a host adds to its copy of the group', async () => {
		const g = group()
		const install = command({ name: 'install', arguments: [{ name: 'plugin', description: 'the plugin' }], run() {} })
		const r = await run({ ...g, commands: [...g.commands, install] }, 'plugins --format json')
		expect(JSON.parse(r.stdout).commands).toEqual(['list', 'search', 'install'])
	})

	test('plugins, invoked bare under output console, prints its help and exits 2 as before', async () => {
		const r = await run(group(), 'plugins', consoleOutput)
		expect(r.stdout).toContain('Usage: app plugins <command>')
		expect(r.exitCode).toBe(2)
	})

	test('keep the console output and return values unchanged under output console', async () => {
		const listed = await run(group({ installed: ['pkg-x'] }), 'plugins list', consoleOutput)
		expect(listed.stdout).toBe('plugins[1]: pkg-x\nhelp[1]: Run `plugins search` to find more plugins on npm\n')
		expect(listed.value).toEqual(['pkg-x'])
		const searched = await run(group({ found: ['pkg-x'] }), 'plugins search', consoleOutput)
		expect(searched.stdout).toBe('packages[1]: pkg-x\nhelp[1]: Run `plugins list` to see which of them are installed\n')
		expect(searched.value).toBeUndefined()
	})

	test('plugins search reports a registry it cannot reach under output console too', async () => {
		const r = await run(group({ found: new Error('fetch failed') }), 'plugins search', consoleOutput)
		expect(r.stderr).toContain('cannot search the npm registry: fetch failed')
		expect(r.exitCode).toBe(1)
	})
})
