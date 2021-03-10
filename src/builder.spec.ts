import a from 'assertron'
import { assertType, IsExtend, isType } from 'type-plus'
import { cli, z } from '.'
import { builder } from './builder'
import { command } from './command'
import { mockContext } from './mockContext'
import { argv, getFixturePath, getLogMessage } from './test-utils'

describe('with options', () => {
  test('specify name, version, and description will skip loading package.json', () => {
    const ctx = mockContext('no-pjson/bin.js')
    ctx.getAppPath = () => { fail('should not reach') }
    const cli = builder(ctx, {
      name: 'app',
      version: '1.0.0',
      description: 'my app'
    })
    a.satisfies(cli, {
      name: 'app',
      version: '1.0.0',
      description: 'my app'
    })
  })

  test('get info from package.json', () => {
    const ctx = mockContext('string-bin/bin.js')
    const cli = builder(ctx, {})
    a.satisfies(cli, {
      name: 'string-bin',
      version: '1.0.0',
      description: ''
    })
  })
})

describe('without options', () => {
  test('no bin in package.json receive folder as name', () => {
    const ctx = mockContext('no-bin/index.js')
    const app = builder(ctx)
    expect(app.name).toBe('no-bin')
  })
  test('get name from package.json/bin string', () => {
    const ctx = mockContext('single-bin/bin.js')
    const app = builder(ctx)
    expect(app.name).toBe('single-cli')
  })
  test('get name from package.json/bin object', () => {
    const ctx = mockContext('multi-bin/bin-a.js')
    const app = builder(ctx)
    expect(app.name).toBe('cli-a')
  })
  test('no version in package.json receive empty version string', () => {
    const ctx = mockContext('no-nothing/index.js')
    const app = builder(ctx)
    expect(app.version).toBe('')
  })
  test('get version', () => {
    const ctx = mockContext('single-bin/bin.js')
    const app = builder(ctx)
    expect(app.version).toBe('1.2.3')
  })
  test('get description', () => {
    const ctx = mockContext('single-bin/bin.js')
    const app = builder(ctx)
    expect(app.description).toBe('a single bin app')
  })
  test('no description in package.json receive empty description string', () => {
    const ctx = mockContext('no-nothing/index.js')
    const app = builder(ctx)
    expect(app.description).toBe('')
  })
  test('exit if call path is not listed in bin', () => {
    const ctx = mockContext('single-bin/other.js')
    builder(ctx)
    a.satisfies(ctx.reporter.logs, [{
      level: 400,
      args: [/Unable to locate/]
    }, {
      id: 'mock-ui',
      level: 400,
      args: ['exit with 1']
    }])
  })
})

describe('default()', () => {
  test('adds default command for cli to run', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const cli = builder(ctx).default({ run() { return 'hello' } })
    expect(await cli.parse(argv('single-bin'))).toEqual('hello')
  })
  test('with array argument', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const a = await builder(ctx).default({
      arguments: [
        { name: 'a', description: 'd', type: z.array(z.string()) }
      ],
      run(args) { return args.a }
    }).parse(argv('string-bin abc'))
    expect(a).toEqual(['abc'])
  })
})

describe('version', () => {
  test('-v shows version', async () => {
    const ctx = mockContext('string-bin/bin.js')
    const cli = builder(ctx).default({ run() { } })
    await cli.parse(argv('string-bin -v'))
    expect(getLogMessage(ctx.reporter)).toEqual('1.0.0')
  })
  test('--version shows version', async () => {
    const ctx = mockContext('string-bin/bin.js')
    const cli = builder(ctx).default({ run() { } })
    await cli.parse(argv('string-bin --version'))
    expect(getLogMessage(ctx.reporter)).toEqual('1.0.0')
  })
})

describe('help', () => {
  test('-h shows help', async () => {
    const ctx = mockContext('string-bin/bin.js')
    const cli = builder(ctx).default({ run() { } })
    await cli.parse(argv('string-bin -h'))
    expect(getLogMessage(ctx.reporter)).toEqual(getHelpMessage(cli))
  })
  test('--help shows version', async () => {
    const ctx = mockContext('string-bin/bin.js')
    const cli = builder(ctx).default({ run() { } })
    await cli.parse(argv('string-bin --help'))
    expect(getLogMessage(ctx.reporter)).toEqual(getHelpMessage(cli))
  })
  test('help with cli.description', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const cli = builder(ctx).default({ run() { } })
    await cli.parse(argv('single-bin -h'))
    expect(getLogMessage(ctx.reporter)).toEqual(getHelpMessage(cli))
  })
  test('show help if no command matches', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const cli = builder(ctx).default({ run() { } })
    await cli.parse(argv('single-bin not-exist'))
    expect(getLogMessage(ctx.reporter)).toEqual(getHelpMessage(cli))
  })
  test('show help if missing argument', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const cli = builder(ctx).default({
      arguments: [{ name: 'abc', description: 'arg abc' }],
      run() { }
    })
    await cli.parse(argv('single-bin'))
    expect(getLogMessage(ctx.reporter)).toEqual(`
Usage: single-cli <arguments> [options]

  a single bin app

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
  test('with command chain', async () => {
    const ctx = mockContext('string-bin/bin.js')
    const cli = builder(ctx).command({
      name: 'sub',
      commands: [command({
        name: 'sub2',
        run() { }
      })]
    })
    await cli.parse(argv('string-bin sub sub2 -h'))
    expect(getLogMessage(ctx.reporter)).toEqual(`
Usage: string-bin sub sub2
`)
  })
})

describe('--silent', () => {
  test('--silent disables ui', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const cli = builder(ctx).default({
      run() {
        this.ui.info('should not print')
        this.ui.warn('should not print')
        this.ui.error('should not print')
      }
    })
    await cli.parse(argv('single-bin --silent'))
    expect(getLogMessage(ctx.reporter)).not.toContain('show not print')
  })
})

describe('--verbose', () => {
  test('--verbose enables debug messages', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const cli = builder(ctx).default({
      run() {
        this.ui.debug('should print')
      }
    })
    await cli.parse(argv('single-bin --verbose'))
    expect(getLogMessage(ctx.reporter)).toContain('should print')
  })
  test('-V enables debug messages', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const cli = builder(ctx).default({
      run() {
        this.ui.debug('should print')
      }
    })
    await cli.parse(argv('single-bin -V'))
    expect(getLogMessage(ctx.reporter)).toContain('should print')
  })
  test('command.run() will not get args.silent or verbose', async () => {
    const ctx = mockContext('single-bin/bin.js')
    builder(ctx).default({
      run(args) {
        isType.false<IsExtend<typeof args, { silent: any }>>()
        isType.false<IsExtend<typeof args, { verbose: any }>>()
      }
    })
  })
})

describe('--debug-cli', () => {
  test('turns on cli-level debug messages', async () => {
    const ctx = mockContext('string-bin/bin.js')
    const app = builder(ctx).default({ run() { } })
    await app.parse(argv('string-bin --debug-cli'))
    const startPath = getFixturePath('string-bin/bin.js')
    const pjsonPath = getFixturePath('string-bin/package.json')
    const msg = getLogMessage(ctx.reporter)
    expect(msg).toContain(`finding package.json starting from '${startPath}'...
found package.json at '${pjsonPath}'
package name: string-bin
version: 1.0.0
description:
argv: node string-bin --debug-cli`)
  })
  test('log loading plugins', async () => {
    const ctx = mockContext('string-bin/bin.js', 'one-plugin')
    const cli = builder(ctx, {
      name: 'plugin-cli',
      version: '1.0.0',
      description: ''
    })
    await cli.loadPlugins().parse(argv('string-bin --debug-cli'))
    const msg = getLogMessage(ctx.reporter)
    expect(msg).toContain(`lookup local plugins with keyword 'plugin-cli-plugin'`)
    expect(msg).toContain(`lookup global plugins with keyword 'plugin-cli-plugin'`)
    expect(msg).toContain(`found local plugins cli-plugin-one`)
    expect(msg).toContain(`activating plugin cli-plugin-one`)
    expect(msg).toContain(`adding command one`)
    expect(msg).toContain(`activated plugin cli-plugin-one`)
  })
})

describe('command()', () => {
  test('single command', async () => {
    const cli = builder(mockContext('single-bin/bin.js'))
      .command({ name: 'cmd1', run() { return 'cmd1' } })
    const actual = await cli.parse(argv('single-bin cmd1'))
    expect(actual).toEqual('cmd1')
  })

  test('multiple commands', async () => {
    const cli = builder(mockContext('single-bin/bin.js'))
      .command({ name: 'cmd1', run() { return 'cmd1' } })
      .command({ name: 'cmd2', run() { return 'cmd2' } })
      .command({ name: 'cmd3', run() { return 'cmd3' } })
      .command({ name: 'cmd4', run() { return 'cmd4' } })
    const actual = await cli.parse(argv('single-bin cmd3'))
    expect(actual).toEqual('cmd3')
  })

  test('nested command', async () => {
    const cli = builder(mockContext('single-bin/bin.js'))
      .command({
        name: 'cmd1',
        commands: [
          { name: 'cmd2', run() { return 'cmd2' } }
        ],
        run() { return 'cmd1' }
      })
    const actual = await cli.parse(argv('single-bin cmd1 cmd2'))
    expect(actual).toEqual('cmd2')
  })
  test('not exist nested command show help', async () => {
    const ctx = mockContext('single-bin/bin.js')
    const cli = builder(ctx)
      .command({
        name: 'cmd1',
        commands: [
          { name: 'cmd2', run() { return 'cmd2' } }
        ]
      })
    await cli.parse(argv('single-bin cmd1 not-exist'))
    expect(getLogMessage(ctx.reporter)).toContain('Usage: single-cli cmd1 <command>')
  })
})

describe('fluent syntax', () => {
  test('default() removes itself', () => {
    const cli = builder(mockContext('string-bin/bin.js', 'has-json-config'))
    const a = cli.default({ run() { } })
    isType.equal<true, never, keyof typeof a & 'default'>()
  })

  test('loadPlugins() removes itself', () => {
    const cli = builder(mockContext('string-bin/bin.js', 'has-json-config'))
    const a = cli.loadPlugins()
    isType.equal<true, never, keyof typeof a & 'loadPlugins'>()
  })

  test('default() adds parse()', () => {
    const cli = builder(mockContext('string-bin/bin.js', 'has-json-config'))
    const a = cli.default({ run() { } })
    isType.equal<true, 'parse', keyof typeof a & 'parse'>()
  })

  test('command() adds parse()', () => {
    const cli = builder(mockContext('string-bin/bin.js', 'has-json-config'))
    const a = cli.command({ name: 'x', run() { } })
    isType.equal<true, 'parse', keyof typeof a & 'parse'>()
  })

  test('loadPlugins() adds parse()', () => {
    const cli = builder(mockContext('string-bin/bin.js', 'has-json-config'))
    const a = cli.loadPlugins()
    isType.equal<true, 'parse', keyof typeof a & 'parse'>()
  })
})

describe('loadConfig()', () => {
  test('load config from `{name}.json` at cwd', async () => {
    const ctx = mockContext('string-bin/bin.js', 'has-json-config')
    const cli = builder(ctx, { configName: 'string-bin' })
      .default({
        config: z.object({ a: z.number() }),
        run() { return this.config }
      })
    const a = await cli.parse(argv('string-bin'))
    expect(a).toEqual({ a: 1 })
  })
  test('load config from `.{name}rc` at cwd', async () => {
    const ctx = mockContext('string-bin/bin.js', 'has-rc-config')
    const cli = builder(ctx, { configName: 'string-bin' })
      .default({
        config: z.object({ a: z.number() }),
        run() { return this.config }
      })
    const a = await cli.parse(argv('string-bin'))
    expect(a).toEqual({ a: 1 })
  })
  test('load config from `.{name}rc.json` at cwd', async () => {
    const ctx = mockContext('string-bin/bin.js', 'has-rc-json-config')
    const cli = builder(ctx)
      .default({
        config: z.object({ a: z.number() }),
        run() { return this.config }
      })
    const a = await cli.parse(argv('string-bin'))
    expect(a).toEqual({ a: 1 })
  })
  test('load config with specified name with file extension', async () => {
    const ctx = mockContext('single-bin/bin.js', 'has-json-config')
    const a = await builder(ctx, { configName: 'string-bin.json' })
      .default({
        config: z.object({ a: z.number() }),
        run() { return this.config }
      }).parse(argv('single-bin'))
    expect(a).toEqual({ a: 1 })
  })
  test('load config with specified `{name}.json`', async () => {
    const ctx = mockContext('single-bin/bin.js', 'has-json-config')
    const a = await builder(ctx, { configName: 'string-bin' })
      .default({
        config: z.object({ a: z.number() }),
        run() { return this.config }
      }).parse(argv('single-bin'))
    expect(a).toEqual({ a: 1 })
  })
  test('load config with specified `.{name}rc`', async () => {
    const ctx = mockContext('single-bin/bin.js', 'has-rc-config')
    const a = await builder(ctx, { configName: 'string-bin' })
      .default({
        config: z.object({ a: z.number() }),
        run() { return this.config }
      }).parse(argv('single-bin'))
    expect(a).toEqual({ a: 1 })
  })
  test('load config with specified `.${name}rc.json`', async () => {
    const ctx = mockContext('single-bin/bin.js', 'has-json-config')
    const a = await builder(ctx, { configName: 'string-bin' })
      .default({
        config: z.object({ a: z.number() }),
        run() { return this.config }
      }).parse(argv('single-bin'))
    expect(a).toEqual({ a: 1 })
  })
  test('config name with . will search for `${name}`', async () => {
    const ctx = mockContext('single-bin/bin.js', 'has-rc-config')
    const a = await builder(ctx, { configName: '.string-binrc' })
      .default({
        config: z.object({ a: z.number() }),
        run() { return this.config }
      }).parse(argv('single-bin'))
    expect(a).toEqual({ a: 1 })
  })
  test('config name with . will search for `${name}.json`', async () => {
    const ctx = mockContext('single-bin/bin.js', 'has-rc-json-config')
    const a = await builder(ctx, { configName: '.string-binrc' })
      .default({
        config: z.object({ a: z.number() }),
        run() { return this.config }
      }).parse(argv('single-bin'))
    expect(a).toEqual({ a: 1 })
  })
  test('config name with . will search for `${name}rc.json`', async () => {
    const ctx = mockContext('single-bin/bin.js', 'has-rc-json-config')
    const a = await builder(ctx, { configName: '.string-bin' })
      .default({
        config: z.object({ a: z.number() }),
        run() { return this.config }
      }).parse(argv('single-bin'))
    expect(a).toEqual({ a: 1 })
  })
  test('config name with . will search for `${name}rc`', async () => {
    const ctx = mockContext('single-bin/bin.js', 'has-rc-config')
    const a = await builder(ctx, { configName: '.string-bin' })
      .default({
        config: z.object({ a: z.number() }),
        run() { return this.config }
      }).parse(argv('single-bin'))
    expect(a).toEqual({ a: 1 })
  })
  test('fail validation will emit warning and exit', async () => {
    const ctx = mockContext('string-bin/bin.js', 'has-json-config')
    await builder(ctx, { configName: 'string-bin' })
      .default({
        config: z.object({
          a: z.object({ c: z.number() }),
          b: z.string()
        }),
        run() { return this.config }
      }).parse(argv('single-bin'))

    // TODO: error message is weak in `zod`.
    // improve this when switching back to type-plus
    expect(getLogMessage(ctx.reporter)).toContain(`config fails validation:
  a: Expected object, received number
  b: Required`)
    // a.satisfies(ctx.reporter.logs, [{
    //   id: 'mock-ui',
    //   level: 400,
    //   args: [`subject expects to be { a: string } but is actually { a: 1 }\nsubject.a expects to be string but is actually 1`]
    // }, {
    //   id: 'mock-ui',
    //   level: 400,
    //   args: ['exit with 1']
    // }])
  })
  test('default() receives config type', async () => {
    const cli = builder(mockContext('has-config/bin.js', 'has-config'))
      .default({
        config: z.object({ a: z.number() }),
        run() {
          assertType<{ a: number }>(this.config)
          return this.config
        }
      })
    const a = await cli.parse(argv('has-config'))
    expect(a).toEqual({ a: 1 })
  })
  test(`read config file in parent directory`, async () => {
    const ctx = mockContext('has-config/bin.js', 'has-config/sub-folder')
    const cli = builder(ctx)
      .default({
        config: z.object({ a: z.number() }),
        run() {
          return this.config
        }
      })
    const a = await cli.parse(argv('has-config'))
    expect(a).toEqual({ a: 1 })
  })
  // seems to be some issue with `zod` default system
  test.skip(`default config is overridden by value in config file`, async () => {
    const ctx = mockContext('has-config/bin.js', 'has-config')
    const a = await builder(ctx)
      .default({
        config: z.object({
          a: z.number().default(2),
          b: z.optional(z.number()).default(3)
        }),
        run() { return this.config }
      })
    expect(a).toEqual({ a: 1, b: 3 })
  })
  test('load config if default command has config', async () => {
    const ctx = mockContext('has-config/bin.js', 'has-config')
    const cli = builder(ctx)
      .default({
        config: z.object({ a: z.number() }),
        run() {
          const cfg = this.config
          isType.equal<true, { a: number }, typeof cfg>()
          return cfg
        }
      })

    const a = await cli.parse(argv('has-config'))
    expect(a).toEqual({ a: 1 })
  })
  test('load config if any command has config', async () => {
    const ctx = mockContext('has-config/bin.js', 'has-config')
    const cli = builder(ctx)
      .command({
        name: 'group',
        commands: [{
          name: 'config',
          config: z.object({ a: z.number() }),
          run() { return this.config }
        }]
      })

    const a = await cli.parse(argv('has-config group config'))
    expect(a).toEqual({ a: 1 })
  })
  test('no config', async () => {
    const ctx = mockContext('single-bin/bin.js', 'no-config')
    const a = await builder(ctx)
      .default({
        config: z.object({ a: z.number() }),
        run() { return this.config }
      }).parse(argv('single-bin'))
    const msg = getLogMessage(ctx.reporter)
    expect(msg).toContain('no config found for single-cli')
    expect(a).toEqual(undefined)
  })
})

describe('loadPlugins()', () => {
  test('use "{name}-plugin" as keyword to look for plugins', async () => {
    const ctx = mockContext('string-bin/bin.js', 'one-plugin')
    const cli = builder(ctx, {
      name: 'plugin-cli',
      version: '1.0.0',
      description: ''
    }).loadPlugins()

    const actual = await cli.parse(argv('string-bin one echo bird'))
    expect(actual).toEqual('bird')
  })
  test('use custom keyword to look for plugins', async () => {
    const ctx = mockContext('string-bin/bin.js', 'alt-keyword-plugin')
    const cli = builder(ctx, {
      name: 'clibuilder',
      version: '1.0.0',
      description: ''
    }).loadPlugins('x-file')
    const actual = await cli.parse(argv('string-bin x echo'))
    expect(actual).toEqual('echo invoked')
  })

  test('pluginCli can specify its own commands', async () => {
    const ctx = mockContext('string-bin/bin.js')
    const cli = builder(ctx, {
      name: 'defaultCommands',
      version: '1.0.0',
      description: ''
    }).command({
      name: 'local',
      run() { return 'local' }
    })

    const actual = await cli.parse(argv('string-bin local'))
    expect(actual).toBe('local')
  })
})

function getHelpMessage(app: Pick<cli.Builder, 'name' | 'description'>) {
  return `
Usage: ${app.name} [options]
${app.description ? `
  ${app.description}
`: ''}
Options:
  [-h|--help]            Print help message
  [-v|--version]         Print the CLI version
  [-V|--verbose]         Turn on verbose logging
  [--silent]             Turn off logging
  [--debug-cli]          Display clibuilder debug messages
`
}
