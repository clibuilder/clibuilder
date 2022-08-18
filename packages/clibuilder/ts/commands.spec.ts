import { builder } from './builder.js'
import { searchPluginsCommand } from './commands.js'
import { mockContext } from './context.mock.js'
import { argv, getLogMessage } from './test-utils/index.js'

describe('pluginsCommand', () => {
  describe('list', () => {
    test('no plugin', async () => {
      const ctx = mockContext({ fixtureDir: 'no-plugin' })
      await builder(ctx, { name: 'plugin-cli', description: '', version: '', keywords: ['plugin-cli-plugin'] })
        .parse(argv('string-bin plugins list'))
      expect(getLogMessage(ctx.sl.reporter)).toContain('no plugin with keywords: plugin-cli-plugin')
    })
    test('one plugin', async () => {
      const ctx = mockContext({ fixtureDir: 'one-plugin' })
      await builder(ctx, { name: 'plugin-cli', description: '', version: '', config: true })
        .parse(argv('string-bin plugins list'))

      expect(getLogMessage(ctx.sl.reporter)).toContain(`found one plugin: cli-plugin-one`)
    })

    test('two plugins', async () => {
      const ctx = mockContext({ fixtureDir: 'two-plugins' })
      await builder(ctx, { name: 'plugin-cli', description: '', version: '', config: true })
        .parse(argv('string-bin plugins list'))

      expect(getLogMessage(ctx.sl.reporter)).toContain(`found the following plugins:

  cli-plugin-one
  cli-plugin-two`)
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
