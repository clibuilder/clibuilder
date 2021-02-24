import { assertType } from 'type-plus'
import { createPluginCliTest, echoCommand } from '../test-util'
import { configCommand } from '../test-util/configCommand'
import { createPluginCli } from './createPluginCli'



describe('config', () => {
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
