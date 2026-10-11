import { testCommand } from 'clibuilder'
import { pluginsCommand } from './group.js'
import { listPluginsCommand } from './list.js'
import { searchPluginsCommand } from './search.js'

describe('pluginsCommand', () => {
	test('groups list and search under plugins', async () => {
		const { messages } = await testCommand(pluginsCommand({ keywords: ['plugin-cli-plugin'] }), 'plugins --help')
		expect(messages).toContain('list')
		expect(messages).toContain('search')
	})

	test('looks for the keywords it is given', async () => {
		const { messages } = await testCommand(pluginsCommand({ keywords: ['plugin-cli-plugin'] }), 'plugins list')
		expect(messages).toContain('plugins: 0 installed plugins found with keywords: plugin-cli-plugin')
	})
})

describe('listPluginsCommand', () => {
	// the found names never come from the real dependency tree here: `findByKeywords` walks
	// whatever is installed next to the cli, which is not something a test can pin down.
	function list(line: string, installed: string[] = [], keywords: string[] = ['plugin-cli-plugin']) {
		return testCommand(
			{ ...listPluginsCommand(keywords), context: { findByKeywords: () => Promise.resolve(installed) } },
			line
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
			'search'
		)

		expect(ctx.messages).toContain('packages: 0 packages found with keywords: plugin-cli-plugin')
	})

	test('one plugin', async () => {
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['plugin-cli']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x']) }
			},
			'search'
		)

		expect(ctx.messages).toContain('packages[1]: pkg-x')
	})

	test('two plugins', async () => {
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['plugin-cli']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x', 'pkg-y']) }
			},
			'search'
		)

		expect(ctx.messages).toContain('packages[2]: pkg-x,pkg-y')
	})

	test('suggests the next command when packages are found', async () => {
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['plugin-cli-plugin']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x']) }
			},
			'search'
		)

		expect(ctx.messages).toContain('help[1]: Run `plugins list` to see which of them are installed')
	})

	test('quotes package names containing the toon delimiter', async () => {
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['plugin-cli-plugin']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['@scope/pkg-x', 'odd,name']) }
			},
			'search'
		)

		expect(ctx.messages).toContain('packages[2]: @scope/pkg-x,"odd,name"')
	})

	test('escapes quotes and backslashes in package names', async () => {
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['plugin-cli-plugin']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['odd"name', 'trailing\\']) }
			},
			'search'
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
			'search'
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
			'search --format text'
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
			'search --format text'
		)
		expect(one.messages).toContain('found one package: pkg-x')

		const none = await testCommand(
			{ ...searchPluginsCommand(['plugin-cli-plugin']), context: { searchByKeywords: () => Promise.resolve([]) } },
			'search --format text'
		)
		expect(none.messages).toContain('no package with keywords: plugin-cli-plugin')
	})

	test('--format json emits the payload alone, so it survives a pipe', async () => {
		const ctx = await testCommand(
			{
				...searchPluginsCommand(['plugin-cli-plugin']),
				context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x', 'pkg-y']) }
			},
			'search --format json'
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
			'search --format json'
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
				line
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
			'search'
		)

		expect(ctx.messages).toContain('packages: 0 packages found with keywords: keyword-a, keyword-b')
	})
})
