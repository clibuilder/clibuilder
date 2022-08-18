import { a } from 'assertron'
import { IsExtend, isType, required } from 'type-plus'
import { builder } from './builder.js'
import { mockContext } from './context.mock.js'
import { cli, command, z } from './index.js'
import { argv } from './test-utils/index.js'

function setupBuilderTest(contextParams?: mockContext.Params, options?: Partial<cli.Options>) {
  const opt = required({ name: 'app', version: '1.0.0' }, options)
  const context = mockContext(contextParams)
  return [builder(context, opt), context] as const
}

it('will not have parse() if there is no `config`, `keywords` and have not define any command', () => {
  const [builder] = setupBuilderTest()
  isType.equal<true, never, (keyof typeof builder) & 'parse'>()
  expect((builder as any).parse).toBeUndefined()
})

describe('default()', () => {
  it('adds default command for cli to run', async () => {
    const [builder] = setupBuilderTest()
    const cli = builder.default({ run() { return 'hello' } })
    expect(await cli.parse(argv('app'))).toEqual('hello')
  })
  it('accepts array arguments', async () => {
    const [builder] = setupBuilderTest()
    const a = await builder.default({
      arguments: [
        { name: 'a', description: 'd', type: z.array(z.string()) }
      ],
      run(args) { return args.a }
    }).parse(argv('app abc def'))
    expect(a).toEqual(['abc', 'def'])
  })

  it('uses the app name in the ui', async () => {
    const [builder, ctx] = setupBuilderTest(undefined, { name: 'some-cli' })
    const cli = builder.default({ run() { this.ui.info('hello') } })
    await cli.parse(argv('single-bin'))
    a.satisfies(ctx.sl.reporter.logs[0], { id: 'some-cli' })
  })
})

describe('version', () => {
  it('accepts -v to show version', async () => {
    const [builder, ctx] = setupBuilderTest()
    const cli = builder.default({ run() { } })
    await cli.parse(argv('app -v'))
    expect(ctx.sl.reporter.getLogMessage()).toEqual('1.0.0')
  })
  it('accepts --version to show version', async () => {
    const [builder, ctx] = setupBuilderTest()
    const cli = builder.default({ run() { } })
    await cli.parse(argv('app --version'))
    expect(ctx.sl.reporter.getLogMessage()).toEqual('1.0.0')
  })
})

describe('help', () => {
  it('accepts -h to show help', async () => {
    const [builder, ctx] = setupBuilderTest()
    const cli = builder.default({ run() { } })
    await cli.parse(argv('app -h'))
    expect(ctx.sl.reporter.getLogMessage()).toEqual(getHelpMessage(cli))
  })
  it('accepts --help to show help', async () => {
    const [builder, ctx] = setupBuilderTest()
    const cli = builder.default({ run() { } })
    await cli.parse(argv('app --help'))
    expect(ctx.sl.reporter.getLogMessage()).toEqual(getHelpMessage(cli))
  })
  it('shows help with description', async () => {
    const [builder, ctx] = setupBuilderTest(undefined, { description: 'some description' })
    const cli = builder.default({ run() { } })
    await cli.parse(argv('app -h'))
    expect(ctx.sl.reporter.getLogMessage()).toEqual(getHelpMessageWithDescription(cli))
  })
  it('shows help if no command matches', async () => {
    const [builder, ctx] = setupBuilderTest()
    const cli = builder.default({ run() { } })
    await cli.parse(argv('app not-exist'))
    expect(ctx.sl.reporter.getLogMessage()).toEqual(getHelpMessage(cli))
  })
  it('shows help if missing argument', async () => {
    const [builder, ctx] = setupBuilderTest()
    const cli = builder.default({
      arguments: [{ name: 'abc', description: 'arg abc' }],
      run() { }
    })
    await cli.parse(argv('app'))
    expect(ctx.sl.reporter.getLogMessage()).toEqual(`
Usage: app <arguments> [options]

Arguments:
  <abc>                  arg abc

Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`)
  })
  it('shows help for command', async () => {
    const [builder, ctx] = setupBuilderTest()
    const cli = builder.command({
      name: 'cmd',
      arguments: [{ name: 'abc', description: 'arg abc' }],
      run() { }
    })
    await cli.parse(argv('app cmd -h'))
    expect(ctx.sl.reporter.getLogMessage()).toEqual(`
Usage: app cmd <arguments>

Arguments:
  <abc>                  arg abc
`)
  })
  it('shows base help with sub command', async () => {
    const [builder, ctx] = setupBuilderTest()
    const cli = builder.command({
      name: 'cmd',
      arguments: [{ name: 'abc', description: 'arg abc' }],
      run() { }
    })
    await cli.parse(argv('app'))
    expect(ctx.sl.reporter.getLogMessage()).toEqual(`
Usage: app <command> [options]

Commands:
  cmd

  <command> -h           Get help for <command>

Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`)
  })
  it('shows help for command chain', async () => {
    const [builder, ctx] = setupBuilderTest()
    const cli = builder.command({
      name: 'sub',
      commands: [command({
        name: 'sub2',
        run() { }
      })]
    })
    await cli.parse(argv('app sub sub2 -h'))
    expect(ctx.sl.reporter.getLogMessage()).toEqual(`
Usage: app sub sub2
`)
  })
})

describe('--silent', () => {
  it('disables UI', async () => {
    const [builder, ctx] = setupBuilderTest()
    const cli = builder.default({
      run() {
        this.ui.info('should not print')
        this.ui.warn('should not print')
        this.ui.error('should not print')
      }
    })
    await cli.parse(argv('app --silent'))
    expect(ctx.sl.reporter.getLogMessage()).toEqual('')
  })

  it('will not be passed down to command args', async () => {
    const [builder] = setupBuilderTest()
    const cli = builder.default({
      run(args) {
        isType.f<IsExtend<typeof args, { silent: any }>>()
        return args
      }
    })
    const args = await cli.parse(argv('app --silent'))
    expect(args.silent).toBeUndefined()

  })
})

describe('verbose', () => {
  it('enables debug messages with --verbose', async () => {
    const [builder, ctx] = setupBuilderTest()
    const cli = builder.default({
      run() { this.ui.debug('should print') }
    })
    await cli.parse(argv('app --verbose'))
    expect(ctx.sl.reporter.getLogMessage()).toContain('should print')
  })
  it('can be enabled with -V', async () => {
    const [builder, ctx] = setupBuilderTest()
    const cli = builder.default({
      run() { this.ui.debug('should print') }
    })
    await cli.parse(argv('app -V'))
    expect(ctx.sl.reporter.getLogMessage()).toContain('should print')
  })
  it('will not be passed down to command args', async () => {
    const [builder] = setupBuilderTest()
    const cli = builder.default({
      run(args) {
        isType.f<IsExtend<typeof args, { verbose: any }>>()
        return args
      }
    })
    const args = await cli.parse(argv('app --verbose'))
    expect(args.verbose).toBeUndefined()
  })
  it('will not be passed down to command args for -V', async () => {
    const [builder] = setupBuilderTest()
    const cli = builder.default({
      run(args) {
        isType.f<IsExtend<typeof args, { V: any }>>()
        return args
      }
    })
    const args = await cli.parse(argv('app -V'))
    expect(args.V).toBeUndefined()
  })
})

describe('debug cli', () => {
  it('turns on cli level debug message with --debug-cli', async () => {
    const [builder, ctx] = setupBuilderTest()
    const app = builder.default({ run() { } })
    await app.parse(argv('app --debug-cli'))
    expect(ctx.sl.reporter.getLogMessage()).toContain(`argv: node app --debug-cli`)
  })
  it('logs when loading plugins', async () => {
    const [builder, ctx] = setupBuilderTest({ fixtureDir: 'one-plugin' }, { config: true })
    const app = builder.default({ run() { } })
    await app.parse(argv('app --debug-cli'))
    const msg = ctx.sl.reporter.getLogMessage()
    expect(msg).toContain('load config from:')
    expect(msg).toContain('app.json')
    expect(msg).toContain(`activating plugin cli-plugin-one`)
    expect(msg).toContain(`adding command one`)
    expect(msg).toContain(`activated plugin cli-plugin-one`)
    expect(msg).toContain(`argv: node app --debug-cli`)
  })
})

// describe('--debug-cli', () => {
//   test('log loading plugins', async () => {
//     const ctx = mockContext('string-bin/bin.js', 'one-plugin')
//     const cli = builder(ctx, {
//       name: 'plugin-cli',
//       version: '1.0.0',
//       description: '',
//       config: true
//     })
//     await cli.parse([])
//     const msg = getLogMessage(ctx.sl.reporter)
//     expect(msg).toContain(`lookup local plugins with keyword 'plugin-cli-plugin'`)
//     expect(msg).toContain(`lookup global plugins with keyword 'plugin-cli-plugin'`)
//     expect(msg).toContain(`found local plugins cli-plugin-one`)
//     expect(msg).toContain(`activating plugin cli-plugin-one`)
//     expect(msg).toContain(`adding command one`)
//     expect(msg).toContain(`activated plugin cli-plugin-one`)
//   })
//   test('command will not get the option', async () => {
//     const ctx = mockContext('single-bin/bin.js')
//     const cli = builder(ctx).default({ run(args) { return args } })
//     const args = await cli.parse(argv('single-bin --debug-cli'))
//     expect(args['debug-cli']).toBeUndefined()
//   })
// })

// describe('command()', () => {
//   test('single command', async () => {
//     const cli = builder(mockContext('single-bin/bin.js'))
//       .command({ name: 'cmd1', run() { return 'cmd1' } })
//     const actual = await cli.parse(argv('single-bin cmd1'))
//     expect(actual).toEqual('cmd1')
//   })
//   test('multiple commands', async () => {
//     const cli = builder(mockContext('single-bin/bin.js'))
//       .command({ name: 'cmd1', run() { return 'cmd1' } })
//       .command({ name: 'cmd2', run() { return 'cmd2' } })
//       .command({ name: 'cmd3', run() { return 'cmd3' } })
//       .command({ name: 'cmd4', run() { return 'cmd4' } })
//     const actual = await cli.parse(argv('single-bin cmd3'))
//     expect(actual).toEqual('cmd3')
//   })
//   test('nested command', async () => {
//     const cli = builder(mockContext('single-bin/bin.js'))
//       .command({
//         name: 'cmd1',
//         commands: [
//           { name: 'cmd2', run() { return 'cmd2' } }
//         ],
//         run() { return 'cmd1' }
//       })
//     const actual = await cli.parse(argv('single-bin cmd1 cmd2'))
//     expect(actual).toEqual('cmd2')
//   })
//   test('not exist nested command show help', async () => {
//     const ctx = mockContext('single-bin/bin.js')
//     const cli = builder(ctx)
//       .command({
//         name: 'cmd1',
//         commands: [
//           { name: 'cmd2', run() { return 'cmd2' } }
//         ]
//       })
//     await cli.parse(argv('single-bin cmd1 not-exist'))
//     expect(getLogMessage(ctx.sl.reporter)).toContain('Usage: single-cli cmd1 <command>')
//   })
//   test('ui uses command name', async () => {
//     const ctx = mockContext('single-bin/bin.js')
//     const cli = builder(ctx)
//       .command({ name: 'cmd1', run() { this.ui.info('hello') } })
//     await cli.parse(argv('single-bin cmd1'))
//     const log = ctx.sl.reporter.logs.find(l => l.args.indexOf('hello') >= 0)
//     a.satisfies(log, { id: 'cmd1' })
//   })
// })

// describe('fluent syntax', () => {
//   test('default() removes itself', () => {
//     const cli = builder(mockContext('string-bin/bin.js', 'has-json-config'))
//     const a = cli.default({ run() { } })
//     isType.equal<true, never, keyof typeof a & 'default'>()
//   })

//   test('default() adds parse()', () => {
//     const cli = builder(mockContext('string-bin/bin.js', 'has-json-config'))
//     const a = cli.default({ run() { } })
//     isType.equal<true, 'parse', keyof typeof a & 'parse'>()
//   })

//   test('command() adds parse()', () => {
//     const cli = builder(mockContext('string-bin/bin.js', 'has-json-config'))
//     const a = cli.command({ name: 'x', run() { } })
//     isType.equal<true, 'parse', keyof typeof a & 'parse'>()
//   })
// })

// describe('loadConfig()', () => {
//   test('load config with specified name with file extension', async () => {
//     const ctx = mockContext('single-bin/bin.js', 'has-json-config')
//     const a = await builder(ctx, { name: 'string-bin', version: '1.0.0', config: 'string-bin.json' })
//       .default({
//         config: z.object({ a: z.number() }),
//         run() { return this.config }
//       }).parse(argv('single-bin'))
//     expect(a).toEqual({ a: 1 })
//   })
//   test('load config with specified `{name}.json`', async () => {
//     const ctx = mockContext('single-bin/bin.js', 'has-json-config')
//     const a = await builder(ctx, { name: 'string-bin', version: '1.0.0', config: 'string-bin' })
//       .default({
//         config: z.object({ a: z.number() }),
//         run() { return this.config }
//       }).parse(argv('single-bin'))
//     expect(a).toEqual({ a: 1 })
//   })
//   test('load config with specified `.{name}rc`', async () => {
//     const ctx = mockContext('single-bin/bin.js', 'has-rc-config')
//     const a = await builder(ctx, { name: 'string-bin', version: '1.0.0', config: 'string-bin' })
//       .default({
//         config: z.object({ a: z.number() }),
//         run() { return this.config }
//       }).parse(argv('single-bin'))
//     expect(a).toEqual({ a: 1 })
//   })
//   test('load config with specified `.${name}rc.json`', async () => {
//     const ctx = mockContext('single-bin/bin.js', 'has-json-config')
//     const a = await builder(ctx, { name: 'string-bin', version: '1.0.0', config: 'string-bin' })
//       .default({
//         config: z.object({ a: z.number() }),
//         run() { return this.config }
//       }).parse(argv('single-bin'))
//     expect(a).toEqual({ a: 1 })
//   })
//   test('config name with . will search for `${name}`', async () => {
//     const ctx = mockContext('single-bin/bin.js', 'has-rc-config')
//     const a = await builder(ctx, { name: 'string-bin', version: '1.0.0', config: '.string-binrc' })
//       .default({
//         config: z.object({ a: z.number() }),
//         run() { return this.config }
//       }).parse(argv('single-bin'))
//     expect(a).toEqual({ a: 1 })
//   })
//   test('config name with . will search for `${name}.json`', async () => {
//     const ctx = mockContext('single-bin/bin.js', 'has-rc-json-config')
//     const a = await builder(ctx, { name: 'string-bin', version: '1.0.0', config: '.string-binrc' })
//       .default({
//         config: z.object({ a: z.number() }),
//         run() { return this.config }
//       }).parse(argv('single-bin'))
//     expect(a).toEqual({ a: 1 })
//   })
//   test('config name with . will search for `${name}rc.json`', async () => {
//     const ctx = mockContext('single-bin/bin.js', 'has-rc-json-config')
//     const a = await builder(ctx, { name: 'single-bin', version: '1.0.0' })
//       .default({
//         config: z.object({ a: z.number() }),
//         run() { return this.config }
//       }).parse(argv('single-bin'))
//     expect(a).toEqual({ a: 1 })
//   })
//   test('config name with . will search for `${name}rc`', async () => {
//     const ctx = mockContext('single-bin/bin.js', 'has-dot-rc-with-json-config')
//     const a = await builder(ctx, {
//       name: 'single-bin',
//       description: '',
//       version: '1.0.0',
//       config: '.string-bin'
//     })
//       .default({
//         config: z.object({ a: z.number() }),
//         run() { return this.config }
//       }).parse(argv('single-bin'))
//     expect(a).toEqual({ a: 1 })
//   })
//   test('fail validation will emit warning and exit', async () => {
//     const ctx = mockContext('string-bin/bin.js', 'has-json-config')
//     await builder(ctx, { name: 'string-bin', version: '1.0.0' })
//       .default({
//         config: z.object({
//           a: z.object({ c: z.number() }),
//           b: z.string()
//         }),
//         run() { fail('should not reach') }
//       }).parse(argv('single-bin'))

//     // TODO: error message is weak in `zod`.
//     // improve this when switching back to type-plus
//     const msg = getLogMessage(ctx.sl.reporter)
//     expect(msg).toContain(`config fails validation:
//   a: Expected object, received number
//   b: Required`)
//     // should also print help
//     expect(msg).toContain(`Usage: string-bin`)
//   })
//   test('default() receives config type', async () => {
//     const cli = builder(mockContext('has-config/bin.js', 'has-config'),
//       { name: 'has-config', version: '1.0.0' })
//       .default({
//         config: z.object({ a: z.number() }),
//         run() {
//           assertType<{ a: number }>(this.config)
//           return this.config
//         }
//       })
//     const a = await cli.parse(argv('has-config'))
//     expect(a).toEqual({ a: 1 })
//   })
//   test(`read config file in parent directory`, async () => {
//     const ctx = mockContext('has-config/bin.js', 'has-config/sub-folder')
//     const cli = builder(ctx, { name: 'has-config', version: '1.0.0' })
//       .default({
//         config: z.object({ a: z.number() }),
//         run() {
//           return this.config
//         }
//       })
//     const a = await cli.parse(argv('has-config'))
//     expect(a).toEqual({ a: 1 })
//   })
//   // seems to be some issue with `zod` default system
//   test.skip(`default config is overridden by value in config file`, async () => {
//     const ctx = mockContext('has-config/bin.js', 'has-config')
//     const a = await builder(ctx)
//       .default({
//         config: z.object({
//           a: z.number().default(2),
//           b: z.optional(z.number()).default(3)
//         }),
//         run() { return this.config }
//       })
//     expect(a).toEqual({ a: 1, b: 3 })
//   })
//   test('load config if default command has config', async () => {
//     const ctx = mockContext('has-config/bin.js', 'has-config')
//     const cli = builder(ctx, { name: 'has-config', version: '1.0.0' })
//       .default({
//         config: z.object({ a: z.number() }),
//         run() {
//           console.log(this)
//           const cfg = this.config
//           isType.equal<true, { a: number }, typeof cfg>()
//           return cfg
//         }
//       })

//     const a = await cli.parse(argv('has-config'))
//     expect(a).toEqual({ a: 1 })
//   })
//   test('load config if any command has config', async () => {
//     const ctx = mockContext('string-bin/bin.js', 'has-config')
//     const cli = builder(ctx, { name: 'has-config', version: '1.0.0' })
//       .command({
//         name: 'group',
//         commands: [{
//           name: 'config',
//           config: z.object({ a: z.number() }),
//           run() { return this.config }
//         }]
//       })
//     const a = await cli.parse(argv('has-config group config'))
//     expect(a).toEqual({ a: 1 })
//   })
//   test('no config', async () => {
//     const ctx = mockContext('single-bin/bin.js', 'no-config')
//     ctx.ui.displayLevel = 'debug'
//     const actual = await builder(ctx)
//       .default({
//         config: z.object({ a: z.number() }),
//         run() { return this.config }
//       }).parse(argv('single-bin'))
//     const msg = getLogMessage(ctx.sl.reporter)
//     expect(msg).toContain(`no config found:`)
//     expect(actual).toEqual(undefined)
//   })
// })

// describe('loadPlugins()', () => {
//   test('load plugins defined in config', async () => {
//     const ctx = mockContext('string-bin/bin.js', 'one-plugin')
//     const cli = builder(ctx, {
//       name: 'string-bin',
//       version: '1.0.0',
//       description: '',
//       config: true
//     })
//     const actual = await cli.parse(argv('string-bin one echo bird'))
//     expect(actual).toEqual('bird')
//   })

//   test('pluginCli can specify its own commands', async () => {
//     const ctx = mockContext('string-bin/bin.js')
//     const cli = builder(ctx, {
//       name: 'defaultCommands',
//       version: '1.0.0',
//       description: '',
//       config: true
//     }).command({
//       name: 'local',
//       run() { return 'local' }
//     })

//     const actual = await cli.parse(argv('string-bin local'))
//     expect(actual).toBe('local')
//   })
// })

function getHelpMessage(app: Pick<cli.Builder, 'name' | 'description'>) {
  return `
Usage: ${app.name} [options]

Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`
}

function getHelpMessageWithDescription(app: Pick<cli.Builder, 'name' | 'description'>) {
  return `
Usage: ${app.name} [options]

  ${app.description}

Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`
}
