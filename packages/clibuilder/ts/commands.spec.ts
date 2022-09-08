import { builder } from './builder.js'
import { searchPluginsCommand } from './commands.js'
import { mockContext } from './context.mock.js'
import { argv, getLogMessage } from './test-utils/index.js'

describe('pluginsCommand', () => {
  describe('list', () => {
    it('warns when the CLI does not have any keywords', async () => {
      const ctx = mockContext({ fixtureDir: 'no-plugin' })
      await builder(ctx, { name: 'test-cli', description: '', version: '', config: true })
        .parse(argv('test-cli plugins list'))
      expect(getLogMessage(ctx.sl.reporter)).toContain('unable to list plugins because this CLI has no keywords specified')
    })
    test('no plugin', async () => {
      const ctx = mockContext({ fixtureDir: 'no-plugin' })
      await builder(ctx, { name: 'test-cli', description: '', version: '', keywords: ['plugin-cli-plugin'] })
        .parse(argv('test-cli plugins list'))
      expect(getLogMessage(ctx.sl.reporter)).toContain('no plugin with keywords: plugin-cli-plugin')
    })
    // There is a bug in Node 14 that requires the plugins to be added in the `clibuilder`.
    // thus this test will fail
    test.skip('one plugin', async () => {
      const ctx = mockContext({ fixtureDir: 'cli-with-one-plugin' })
      await builder(ctx, { name: 'test-cli', description: '', version: '', keywords: ['test-cli'] })
        .parse(argv('test-cli plugins list'))

      expect(getLogMessage(ctx.sl.reporter)).toContain(`found one plugin: cjs-plugin`)
    })

    // There is a bug in Node 14 that requires the plugins to be added in the `clibuilder`.
    // thus this test will fail
    test.skip('two plugins', async () => {
      const ctx = mockContext({ fixtureDir: 'cli-with-two-plugins' })
      await builder(ctx, { name: 'test-cli', description: '', version: '', config: true, keywords: ['test-cli'] })
        .parse(argv('test-cli plugins list'))
      const msg = getLogMessage(ctx.sl.reporter)
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
      }).parse(argv('string-bin search'))

    expect(getLogMessage(ctx.sl.reporter)).toContain('no package with keywords: plugin-cli-plugin')
  })

  test('one plugin', async () => {
    const ctx = mockContext({ fixtureDir: 'one-plugin' })
    await builder(ctx, { name: 'plugin-cli', version: '1.0.0', config: true })
      .command({
        ...searchPluginsCommand,
        context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x']) }
      }).parse(argv('string-bin search'))

    expect(getLogMessage(ctx.sl.reporter)).toContain('found one package: pkg-x')
  })

  test('two plugins', async () => {
    const ctx = mockContext({ fixtureDir: 'two-plugin' })
    await builder(ctx, { name: 'plugin-cli', description: '', version: '', config: true })
      .command({
        ...searchPluginsCommand,
        context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x', 'pkg-y']) }
      }).parse(argv('string-bin search'))

    expect(getLogMessage(ctx.sl.reporter)).toContain(`found the following packages:

  pkg-x
  pkg-y`)
  })
})
