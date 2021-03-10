import { isType } from 'type-plus'
import { command, types } from '.'
import { builder } from './builder'
import { searchPluginsCommand } from './commands'
import { mockContext } from './mockContext'
import { argv, getLogMessage } from './test-utils'

test('when no argument and options, args will have help', () => {
  command({
    name: 'cmd',
    run(args) {
      isType.equal<true, boolean | undefined, typeof args.help>()
    }
  })
})

test('command can override help', () => {
  command({
    name: 'cmd',
    options: { help: { description: 'help with topic', type: types.string() } },
    run(args) {
      isType.equal<true, string, typeof args.help>()
    }
  })
})

test('argument with defined type', () => {
  command({
    name: 'cmd',
    arguments: [{ name: 'arg1', description: 'desc', type: types.number() }],
    run(args) {
      isType.equal<true, number, typeof args.arg1>()
    }
  })
})

test('argument type defaults to string', () => {
  command({
    name: 'cmd',
    arguments: [{ name: 'arg1', description: 'desc' }],
    run(args) {
      isType.equal<true, string, typeof args.arg1>()
    }
  })
})

test('argument of number array', () => {
  command({
    name: 'cmd',
    arguments: [{ name: 'arg1', description: 'desc', type: types.array(types.number()) }],
    run(args) {
      isType.equal<true, number[], typeof args.arg1>()
    }
  })
})

test('multiple arguments with omitted type', () => {
  command({
    name: 'cmd',
    arguments: [
      { name: 'arg1', description: 'desc' },
      { name: 'arg2', description: 'desc', type: types.boolean() }],
    run(args) {
      isType.equal<true, string, typeof args.arg1>()
      isType.equal<true, boolean, typeof args.arg2>()
    }
  })
})

test('option type defaults to boolean', () => {
  command({
    name: 'cmd',
    options: {
      abc: { description: 'abc' }
    },
    run(args) {
      isType.equal<true, boolean | undefined, typeof args.abc>()
    }
  })
})

test('options with type', () => {
  command({
    name: 'cmd',
    options: {
      abc: { description: 'abc', type: types.array(types.string()) }
    },
    run(args) {
      isType.equal<true, string[], typeof args.abc>()
    }
  })
})

test('multiple options with omitted type', () => {
  command({
    name: 'cmd',
    options: {
      abc: { description: 'abc', type: types.array(types.string()) },
      def: { description: 'abc' }
    },
    run(args) {
      isType.equal<true, string[], typeof args.abc>()
      isType.equal<true, boolean | undefined, typeof args.def>()
    }
  })
})

test('with arguments and options', () => {
  command({
    name: 'cmd',
    arguments: [
      { name: 'arg1', description: 'desc' },
      { name: 'arg2', description: 'desc', type: types.boolean() }],
    options: {
      abc: { description: 'abc', type: types.array(types.string()) },
      def: { description: 'abc' }
    },
    run(args) {
      isType.equal<true, string, typeof args.arg1>()
      isType.equal<true, boolean, typeof args.arg2>()
      isType.equal<true, string[], typeof args.abc>()
      isType.equal<true, boolean | undefined, typeof args.def>()
    }
  })
})

test('options with optional type', () => {
  command({
    name: 'cmd',
    options: {
      abc: { description: 'abc', type: types.optional(types.string()) }
    },
    run(args) {
      isType.equal<true, string | undefined, typeof args.abc>()
    }
  })
})

describe('pluginsCommand', () => {
  describe('list', () => {
    test('no plugin', async () => {
      const ctx = mockContext('string-bin/bin.js', 'no-plugin')
      await builder(ctx, { name: 'plugin-cli', description: '', version: '' })
        .loadPlugins().parse(argv('string-bin plugins list'))
      expect(getLogMessage(ctx.reporter)).toContain('no plugin with keyword: plugin-cli-plugin')
    })
    test('one plugin', async () => {
      const ctx = mockContext('string-bin/bin.js', 'one-plugin')
      await builder(ctx, { name: 'plugin-cli', description: '', version: '' })
        .loadPlugins().parse(argv('string-bin plugins list'))

      expect(getLogMessage(ctx.reporter)).toContain(`found one plugin: cli-plugin-one`)
    })

    test('two plugins', async () => {
      const ctx = mockContext('string-bin/bin.js', 'two-plugins')
      await builder(ctx, { name: 'plugin-cli', description: '', version: '' })
        .loadPlugins().parse(argv('string-bin plugins list'))

      expect(getLogMessage(ctx.reporter)).toContain(`found the following plugins:

  cli-plugin-one
  cli-plugin-two`)
    })
  })
})

describe('searchPluginsCommand', () => {
  test('no plugin', async () => {
    const ctx = mockContext('string-bin/bin.js', 'no-plugin')
    await builder(ctx, { name: 'plugin-cli' })
      .loadPlugins().command({
        ...searchPluginsCommand,
        context: { searchByKeywords: () => Promise.resolve([]) }
      }).parse(argv('string-bin search'))

    expect(getLogMessage(ctx.reporter)).toContain('no package with keyword: plugin-cli-plugin')
  })

  test('one plugin', async () => {
    const ctx = mockContext('string-bin/bin.js', 'no-plugin')
    await builder(ctx, { name: 'plugin-cli' })
      .loadPlugins().command({
        ...searchPluginsCommand,
        context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x']) }
      }).parse(argv('string-bin search'))

    expect(getLogMessage(ctx.reporter)).toContain('found one package: pkg-x')
  })

  test('two plugins', async () => {
    const ctx = mockContext('string-bin/bin.js', 'no-plugin')
    await builder(ctx, { name: 'plugin-cli', description: '', version: '' })
      .loadPlugins().command({
        ...searchPluginsCommand,
        context: { searchByKeywords: (_: string[]) => Promise.resolve(['pkg-x', 'pkg-y']) }
      }).parse(argv('string-bin search'))

    expect(getLogMessage(ctx.reporter)).toContain(`found the following packages:

  pkg-x
  pkg-y`)
  })
})
