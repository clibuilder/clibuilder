import { builder } from './builder.js'
import { listPluginsCommand, searchPluginsCommand } from './commands.js'
import { mockContext } from './context.mock.js'
import { argv } from './test-utils/index.js'

describe('pluginsCommand', () => {
	describe('list', () => {
		test('no plugin', async () => {
			const ctx = mockContext({ fixtureDir: 'no-plugin' })
			await builder(ctx, {
				name: 'test-cli',
				description: '',
				version: '',
				keywords: ['plugin-cli-plugin']
			}).parse(argv('test-cli plugins list'))
			expect(ctx.sl.reporter.getLogMessage()).toContain(
				'plugins: 0 installed plugins found with keywords: plugin-cli-plugin'
			)
		})
		// There is a bug in Node 14 that requires the plugins to be added in the `clibuilder`.
		// thus this test will fail
		test.skip('one plugin', async () => {
			const ctx = mockContext({ fixtureDir: 'cli-with-one-plugin' })
			await builder(ctx, {
				name: 'test-cli',
				description: '',
				version: '',
				keywords: ['test-cli']
			}).parse(argv('test-cli plugins list'))

			expect(ctx.sl.reporter.getLogMessage()).toContain('plugins[1]: cjs-plugin')
		})

		// There is a bug in Node 14 that requires the plugins to be added in the `clibuilder`.
		// thus this test will fail
		test.skip('two plugins', async () => {
			const ctx = mockContext({ fixtureDir: 'cli-with-two-plugins' })
			await builder(ctx, {
				name: 'test-cli',
				description: '',
				version: '',
				config: true,
				keywords: ['test-cli']
			}).parse(argv('test-cli plugins list'))
			const msg = ctx.sl.reporter.getLogMessage()
			expect(msg).toContain('plugins[2]: cjs-plugin,plugin-two')
		})
	})
})

describe('listPluginsCommand', () => {
	// the found names never come from the real dependency tree here: `findByKeywords` walks
	// whatever is installed next to the cli, which is not something a test can pin down.
	function list(ctx: ReturnType<typeof mockContext>, line: string, installed: string[] = [], keywords?: string[]) {
		return builder(ctx, { name: 'plugin-cli', version: '1.0.0', keywords: keywords ?? ['plugin-cli-plugin'] })
			.command({ ...listPluginsCommand, context: { findByKeywords: () => Promise.resolve(installed) } })
			.parse(argv(line))
	}

	test('reports the installed plugins as toon by default', async () => {
		const ctx = mockContext()
		await list(ctx, 'string-bin list', ['pkg-x', 'pkg-y'])

		expect(ctx.sl.reporter.getLogMessage()).toContain('plugins[2]: pkg-x,pkg-y')
	})

	test('keeps the same shape for a single plugin', async () => {
		const ctx = mockContext()
		await list(ctx, 'string-bin list', ['pkg-x'])

		expect(ctx.sl.reporter.getLogMessage()).toContain('plugins[1]: pkg-x')
	})

	test('states the empty result as nothing installed, not nothing published', async () => {
		const ctx = mockContext()
		await list(ctx, 'string-bin list', [], ['keyword-a', 'keyword-b'])

		const msg = ctx.sl.reporter.getLogMessage()
		expect(msg).toContain('plugins: 0 installed plugins found with keywords: keyword-a, keyword-b')
		expect(msg).toContain('help[1]: Run `plugins search` to find plugins to install')
	})

	test('suggests the registry when plugins are already installed', async () => {
		const ctx = mockContext()
		await list(ctx, 'string-bin list', ['pkg-x'])

		expect(ctx.sl.reporter.getLogMessage()).toContain('help[1]: Run `plugins search` to find more plugins on npm')
	})

	test('quotes plugin names that would read as two toon entries', async () => {
		const ctx = mockContext()
		await list(ctx, 'string-bin list', ['@scope/pkg-x', 'odd,name'])

		expect(ctx.sl.reporter.getLogMessage()).toContain('plugins[2]: @scope/pkg-x,"odd,name"')
	})

	test('returns the found plugins, whatever the format', async () => {
		expect(await list(mockContext(), 'string-bin list', ['pkg-x', 'pkg-y'])).toEqual(['pkg-x', 'pkg-y'])
		expect(await list(mockContext(), 'string-bin list --format json', ['pkg-x'])).toEqual(['pkg-x'])
		expect(await list(mockContext(), 'string-bin list', [])).toEqual([])
	})

	test('--format text keeps the human-readable prose', async () => {
		const ctx = mockContext()
		await list(ctx, 'string-bin list --format text', ['pkg-x', 'pkg-y'])

		expect(ctx.sl.reporter.getLogMessage()).toContain(`found the following plugins:

  pkg-x
  pkg-y`)
	})

	test('--format text reports one plugin and none in prose', async () => {
		const one = mockContext()
		await list(one, 'string-bin list --format text', ['pkg-x'])
		expect(one.sl.reporter.getLogMessage()).toContain('found one plugin: pkg-x')

		const none = mockContext()
		await list(none, 'string-bin list --format text', [])
		expect(none.sl.reporter.getLogMessage()).toContain('no plugin with keywords: plugin-cli-plugin')
	})

	test('--format json emits the payload alone, so it survives a pipe', async () => {
		const ctx = mockContext()
		await list(ctx, 'string-bin list --format json', ['pkg-x', 'pkg-y'])

		const msg = ctx.sl.reporter.getLogMessage()
		expect(msg).toContain(`{
  "plugins": [
    "pkg-x",
    "pkg-y"
  ]
}`)
		expect(msg).not.toContain('help[1]')
	})

	test('--format json states the empty result as data', async () => {
		const ctx = mockContext()
		await list(ctx, 'string-bin list --format json', [])

		expect(ctx.sl.reporter.getLogMessage()).toContain('"plugins": []')
	})

	test('rejects an unknown --format value as a usage error', async () => {
		const ctx = mockContext()
		await list(ctx, 'string-bin list --format yaml', ['pkg-x'])

		const msg = ctx.sl.reporter.getLogMessage()
		expect(msg).toContain('invalid value for option --format')
		expect(msg).not.toContain('plugins[')
		expect(ctx.exitCode).toBe(2)
	})
})

describe('searchPluginsCommand', () => {
	test('no plugin', async () => {
		const ctx = mockContext()
		await builder(ctx, { name: 'plugin-cli', version: '1.0.0', keywords: ['plugin-cli-plugin'] })
			.command({
				...searchPluginsCommand,
				context: { searchByKeywords: () => Promise.resolve([]) }
			})
			.parse(argv('string-bin search'))

		expect(ctx.sl.reporter.getLogMessage()).toContain('packages: 0 packages found with keywords: plugin-cli-plugin')
	})

	test('one plugin', async () => {
		const ctx = mockContext({ fixtureDir: 'one-plugin' })
		await builder(ctx, { name: 'plugin-cli', version: '1.0.0', config: true })
			.command({
				...searchPluginsCommand,
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x']) }
			})
			.parse(argv('string-bin search'))

		expect(ctx.sl.reporter.getLogMessage()).toContain('packages[1]: pkg-x')
	})

	test('two plugins', async () => {
		const ctx = mockContext({ fixtureDir: 'two-plugin' })
		await builder(ctx, { name: 'plugin-cli', description: '', version: '', config: true })
			.command({
				...searchPluginsCommand,
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x', 'pkg-y']) }
			})
			.parse(argv('string-bin search'))

		expect(ctx.sl.reporter.getLogMessage()).toContain('packages[2]: pkg-x,pkg-y')
	})

	test('suggests the next command when packages are found', async () => {
		const ctx = mockContext()
		await builder(ctx, { name: 'plugin-cli', version: '1.0.0', keywords: ['plugin-cli-plugin'] })
			.command({
				...searchPluginsCommand,
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x']) }
			})
			.parse(argv('string-bin search'))

		expect(ctx.sl.reporter.getLogMessage()).toContain('help[1]: Run `plugins list` to see which of them are installed')
	})

	test('quotes package names containing the toon delimiter', async () => {
		const ctx = mockContext()
		await builder(ctx, { name: 'plugin-cli', version: '1.0.0', keywords: ['plugin-cli-plugin'] })
			.command({
				...searchPluginsCommand,
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['@scope/pkg-x', 'odd,name']) }
			})
			.parse(argv('string-bin search'))

		expect(ctx.sl.reporter.getLogMessage()).toContain('packages[2]: @scope/pkg-x,"odd,name"')
	})

	test('escapes quotes and backslashes in package names', async () => {
		const ctx = mockContext()
		await builder(ctx, { name: 'plugin-cli', version: '1.0.0', keywords: ['plugin-cli-plugin'] })
			.command({
				...searchPluginsCommand,
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['odd"name', 'trailing\\']) }
			})
			.parse(argv('string-bin search'))

		// a hand-escaped trailing backslash would escape the closing quote and merge the entries
		expect(ctx.sl.reporter.getLogMessage()).toContain('packages[2]: "odd\\"name","trailing\\\\"')
	})

	test('searches each keyword separately and unions the results', async () => {
		const ctx = mockContext()
		const calls: string[][] = []
		const found: Record<string, string[]> = {
			'keyword-a': ['pkg-a', 'pkg-shared'],
			'keyword-b': ['pkg-shared', 'pkg-b']
		}
		await builder(ctx, { name: 'plugin-cli', version: '1.0.0', keywords: ['keyword-a', 'keyword-b'] })
			.command({
				...searchPluginsCommand,
				context: {
					searchByKeywords: (keywords: string[]) => {
						calls.push(keywords)
						return Promise.resolve(keywords.flatMap((k) => found[k] ?? []))
					}
				}
			})
			.parse(argv('string-bin search'))

		expect(calls).toEqual([['keyword-a'], ['keyword-b']])
		expect(ctx.sl.reporter.getLogMessage()).toContain('packages[3]: pkg-a,pkg-shared,pkg-b')
	})

	test('--format text keeps the human-readable prose', async () => {
		const ctx = mockContext()
		await builder(ctx, { name: 'plugin-cli', version: '1.0.0', keywords: ['plugin-cli-plugin'] })
			.command({
				...searchPluginsCommand,
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x', 'pkg-y']) }
			})
			.parse(argv('string-bin search --format text'))

		expect(ctx.sl.reporter.getLogMessage()).toContain(`found the following packages:

  pkg-x
  pkg-y`)
	})

	test('--format text reports one package and none in prose', async () => {
		const one = mockContext()
		await builder(one, { name: 'plugin-cli', version: '1.0.0', keywords: ['plugin-cli-plugin'] })
			.command({
				...searchPluginsCommand,
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x']) }
			})
			.parse(argv('string-bin search --format text'))
		expect(one.sl.reporter.getLogMessage()).toContain('found one package: pkg-x')

		const none = mockContext()
		await builder(none, { name: 'plugin-cli', version: '1.0.0', keywords: ['plugin-cli-plugin'] })
			.command({
				...searchPluginsCommand,
				context: { searchByKeywords: () => Promise.resolve([]) }
			})
			.parse(argv('string-bin search --format text'))
		expect(none.sl.reporter.getLogMessage()).toContain('no package with keywords: plugin-cli-plugin')
	})

	test('--format json emits the payload alone, so it survives a pipe', async () => {
		const ctx = mockContext()
		await builder(ctx, { name: 'plugin-cli', version: '1.0.0', keywords: ['plugin-cli-plugin'] })
			.command({
				...searchPluginsCommand,
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x', 'pkg-y']) }
			})
			.parse(argv('string-bin search --format json'))

		const msg = ctx.sl.reporter.getLogMessage()
		expect(msg).toContain(`{
  "packages": [
    "pkg-x",
    "pkg-y"
  ]
}`)
		expect(msg).not.toContain('help[1]')
	})

	test('--format json states the empty result as data', async () => {
		const ctx = mockContext()
		await builder(ctx, { name: 'plugin-cli', version: '1.0.0', keywords: ['plugin-cli-plugin'] })
			.command({
				...searchPluginsCommand,
				context: { searchByKeywords: () => Promise.resolve([]) }
			})
			.parse(argv('string-bin search --format json'))

		expect(ctx.sl.reporter.getLogMessage()).toContain('"packages": []')
	})

	describe('--fields keywords', () => {
		// `pkg-a` matches only the first keyword, `pkg-b` only the second, `pkg-both` carries both.
		const mixed: Record<string, string[]> = {
			'keyword-a': ['pkg-a', 'pkg-both'],
			'keyword-b': ['pkg-both', 'pkg-b']
		}
		const searchMixed = (keywords: string[]) => Promise.resolve(keywords.flatMap((k) => mixed[k] ?? []))

		async function search(ctx: ReturnType<typeof mockContext>, line: string) {
			await builder(ctx, { name: 'plugin-cli', version: '1.0.0', keywords: ['keyword-a', 'keyword-b'] })
				.command({ ...searchPluginsCommand, context: { searchByKeywords: searchMixed } })
				.parse(argv(line))
			return ctx.sl.reporter.getLogMessage()
		}

		test('reports which keyword found each package as a toon table', async () => {
			expect(await search(mockContext(), 'string-bin search --fields keywords')).toContain(`packages[3]{name,keywords}:
  pkg-a,keyword-a
  pkg-both,keyword-a keyword-b
  pkg-b,keyword-b`)
		})

		test('naming `name` alongside it is a no-op, not an error', async () => {
			expect(await search(mockContext(), 'string-bin search --fields name,keywords')).toContain(
				'packages[3]{name,keywords}:'
			)
		})

		test('stays a flat array when the field is not asked for', async () => {
			expect(await search(mockContext(), 'string-bin search')).toContain('packages[3]: pkg-a,pkg-both,pkg-b')
		})

		test('annotates the prose in --format text', async () => {
			expect(await search(mockContext(), 'string-bin search --format text --fields keywords')).toContain(`  pkg-a (keyword-a)
  pkg-both (keyword-a, keyword-b)
  pkg-b (keyword-b)`)
		})

		test('turns the json payload into objects', async () => {
			expect(await search(mockContext(), 'string-bin search --format json --fields keywords')).toContain(`{
      "name": "pkg-both",
      "keywords": [
        "keyword-a",
        "keyword-b"
      ]
    }`)
		})

		test('rejects an unknown field instead of silently dropping it', async () => {
			const msg = await search(mockContext(), 'string-bin search --fields author')
			expect(msg).toContain('error: unknown value for --fields: author')
			expect(msg).toContain('help[1]: The only extra field is `keywords`')
			expect(msg).not.toContain('packages[')
		})
	})

	test('reports zero with every keyword when no keyword matches', async () => {
		const ctx = mockContext()
		await builder(ctx, { name: 'plugin-cli', version: '1.0.0', keywords: ['keyword-a', 'keyword-b'] })
			.command({
				...searchPluginsCommand,
				context: { searchByKeywords: (_: string[]) => Promise.resolve([]) }
			})
			.parse(argv('string-bin search'))

		expect(ctx.sl.reporter.getLogMessage()).toContain('packages: 0 packages found with keywords: keyword-a, keyword-b')
	})
})
