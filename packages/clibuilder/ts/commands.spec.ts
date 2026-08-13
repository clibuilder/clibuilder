import { builder } from './builder.js'
import { searchPluginsCommand } from './commands.js'
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
			expect(ctx.sl.reporter.getLogMessage()).toContain('no plugin with keywords: plugin-cli-plugin')
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

			expect(ctx.sl.reporter.getLogMessage()).toContain('found one plugin: cjs-plugin')
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
			expect(msg).toContain(`found the following plugins:

  cjs-plugin
  plugin-two`)
		})
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
