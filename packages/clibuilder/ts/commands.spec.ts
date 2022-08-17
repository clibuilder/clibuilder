import { builder } from './builder.js'
import { searchPluginsCommand } from './commands.js'
import { mockContext } from './context.mock'
import { argv, getLogMessage } from './test-utils/index.js'

describe('pluginsCommand', () => {
  describe('list', () => {
    test('no plugin', async () => {
      const ctx = mockContext('string-bin/bin.js', 'no-plugin')
      await builder(ctx, { name: 'plugin-cli', description: '', version: '' })
        .parse(argv('string-bin plugins list'))
      expect(getLogMessage(ctx.sl.reporter)).toContain('no plugin with keywords: plugin-cli-plugin')
    })
    test('one plugin', async () => {
      const ctx = mockContext('string-bin/bin.js', 'one-plugin')
      await builder(ctx, { name: 'plugin-cli', description: '', version: '', config: true })
        .parse(argv('string-bin plugins list'))

      expect(getLogMessage(ctx.sl.reporter)).toContain(`found one plugin: cli-plugin-one`)
    })

    test('two plugins', async () => {
      const ctx = mockContext('string-bin/bin.js', 'two-plugins')
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
    const ctx = mockContext('no-plugin', 'no-plugin')
    await builder(ctx, { name: 'plugin-cli', config: true })
      .command({
        ...searchPluginsCommand,
        context: { searchByKeywords: () => Promise.resolve([]) }
      }).parse(argv('string-bin search'))

    expect(getLogMessage(ctx.sl.reporter)).toContain('no package with keywords: plugin-cli-plugin')
  })

  test('one plugin', async () => {
    const ctx = mockContext('string-bin/bin.js', 'no-plugin')
    await builder(ctx, { name: 'plugin-cli', config: true })
      .command({
        ...searchPluginsCommand,
        context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x']) }
      }).parse(argv('string-bin search'))

    expect(getLogMessage(ctx.sl.reporter)).toContain('found one package: pkg-x')
  })

  test('two plugins', async () => {
    const ctx = mockContext('string-bin/bin.js', 'no-plugin')
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
