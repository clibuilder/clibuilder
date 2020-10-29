import { assertType } from 'type-plus'
import { createCliArgv, createPluginCliTest, generateDisplayedMessage, echoCommand } from '../test-util'
import { configCommand } from '../test-util/configCommand'
import { createPluginCli } from './createPluginCli'

test('use "{name}-plugin" as keyword to look for plugins', async () => {
  const { cli } = createPluginCliTest({
    name: 'plugin-cli',
    version: '1.0.0',
    context: { cwd: 'fixtures/one-plugin' },
  })
  const actual = await cli.parse(createCliArgv('cli', 'one', 'echo', 'bird'))
  expect(actual).toEqual('bird')
})

test('use custom keyword to look for plugins', async () => {
  const { cli } = createPluginCliTest({
    name: 'clibuilder',
    version: '1.0.0',
    keyword: 'x-file',
    context: { cwd: 'fixtures/alt-keyword-plugin' },
  })
  const actual = await cli.parse(createCliArgv('cli', 'x', 'echo'))
  expect(actual).toEqual('echo invoked')
})

test('pluginCli can specify its own commands', async () => {
  const { cli, argv } = createPluginCliTest({
    name: 'defaultCommands',
    version: '1.0.0',
    commands: [{
      name: 'local', description: '',
      run() { return this.name }
    }],
  }, 'local')

  const actual = await cli.parse(argv)
  expect(actual).toBe('local')
})

test('is runnable with ui', async () => {
  const { cli, argv, ui } = createPluginCliTest({
    name: 'cli',
    version: '1.0.0',
    run() {
      this.ui.info('hello world')
    }
  })
  await cli.parse(argv)

  const message = generateDisplayedMessage(ui.display.infoLogs)
  expect(message).toBe('hello world')
})

describe('config', () => {
  test('config is available as property', async () => {
    const { cli, argv } = createPluginCliTest({
      config: { a: 2 },
      run() {
        assertType<{ a: number }>(this.config)
        return this.config
      }
    })
    const actual = await cli.parse(argv)
    expect(actual).toEqual({ a: 2 })
  })

  test.skip('config is not available in run context when not specified in the option', async () => {
    createPluginCliTest({
      description: '',
      run() {
        // https://github.com/microsoft/TypeScript/issues/36005
        // there is a bug in TypeScript to prevent me from properly eliminate this property,
        // when it is not defined in the `ConstructOptions`.
        // assertType.isUndefined(this.config)
      }
    })
  })

  test('load config', async () => {
    const { cli, argv } = createPluginCliTest({
      name: 'test-cli',
      config: { a: 2 },
      context: { cwd: 'fixtures/has-config' },
      run() { return this.config }
    })
    const actual = await cli.parse(argv)
    expect(actual).toEqual({ a: 1 })
  })

  test(`read config file in parent directory`, async () => {
    const { cli, argv } = createPluginCliTest({
      name: 'test-cli',
      config: { a: 2 },
      context: { cwd: 'fixtures/has-config/sub-folder' },
      description: '',
      run() {
        expect(this.config).toEqual({ a: 1 })
      },
    })

    await cli.parse(argv)
  })

  test(`default config is overriden by value in config file`, async () => {
    const { cli, argv } = createPluginCliTest({
      name: 'test-cli',
      config: { a: 2, b: 3 },
      context: { cwd: 'fixtures/has-config' },
      description: '',
      run() {
        expect(this.config).toEqual({ a: 1, b: 3 })
      },
    })

    await cli.parse(argv)
  })

  test('use different config name', async () => {
    const { cli, argv } = createPluginCliTest({
      name: 'another-cli',
      config: { a: 2 },
      configName: 'test-cli',
      context: { cwd: 'fixtures/has-config' },
      run() {
        expect(this.config).toEqual({ a: 1 })
      },
    })

    await cli.parse(argv)
  })

  test('load config if any command has config', async () => {
    const { cli, argv } = createPluginCliTest({
      name: 'test-cli',
      context: { cwd: 'fixtures/has-config' },
      commands: [{
        name: 'group',
        commands: [configCommand]
      }],
    }, 'group', 'config')

    const actual = await cli.parse(argv)
    expect(actual).toEqual({ a: 1 })
  })

  test('plugin cli with commands infers config and context type in run()', async () => {
    createPluginCli({
      name: 'test-cli',
      version: '',
      config: { a: 1 },
      context: { b: 'b' },
      commands: [echoCommand, configCommand],
      run() {
        assertType.isNumber(this.config.a)
        assertType.isString(this.b)
      }
    })
  })

  test('plugin cli infers config and context to command', async () => {
    createPluginCli({
      name: 'test-cli',
      version: '',
      config: { a: 1 },
      context: { b: 'b' },
      commands: [{
        name: 'cmd-a',
        description: '',
        run() {
          assertType.isNumber(this.config.a)
          assertType.isString(this.b)
        }
      }],
    })
  })
})
