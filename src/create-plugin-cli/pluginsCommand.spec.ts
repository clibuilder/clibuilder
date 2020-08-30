import t from 'assert'
import { createCliTest, createPluginCliTest, generateDisplayedMessage } from '../test-util'
import { pluginsCommand } from './pluginsCommand'

describe('list', () => {
  test('can only be used by PluginCli', async () => {
    // mark `as any` just for test.
    // normally TypeScript will flag the problem in all situation,
    // including when the command is created in another package.
    const { cli, argv, ui } = createCliTest({ commands: [pluginsCommand] as any }, 'plugins', 'list')
    await cli.parse(argv)

    const message = generateDisplayedMessage(ui.display.errorLogs)
    t.strictEqual(message, 'plugins list command can only be used by PluginCli')
  })

  test('no plugin', async () => {
    const { cli, argv, ui } = createPluginCliTest({ context: { cwd: 'fixtures/no-plugin' } }, 'plugins', 'list')
    await cli.parse(argv)

    const message = generateDisplayedMessage(ui.display.infoLogs)
    t.strictEqual(message, 'no plugin with keyword: plugin-cli-plugin')
  })

  test('one plugin', async () => {
    const { cli, argv, ui } = createPluginCliTest({ context: { cwd: 'fixtures/one-plugin' } }, 'plugins', 'list')
    await cli.parse(argv)

    const message = generateDisplayedMessage(ui.display.infoLogs)
    t.strictEqual(message, `found one plugin: cli-plugin-one`)
  })

  test('two plugins', async () => {
    const { cli, argv, ui } = createPluginCliTest({ context: { cwd: 'fixtures/two-plugins' } }, 'plugins', 'list')
    await cli.parse(argv)

    const message = generateDisplayedMessage(ui.display.infoLogs)
    t.strictEqual(message, `found the following plugins:

  cli-plugin-one
  cli-plugin-two`)
  })
})
