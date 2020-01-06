import { PluginCli } from '../plugin-cli/types'
import { listPluginsCommand } from './listPluginsCommand'
import { searchPluginsCommand } from './searchPluginsCommand'

export const pluginsCommand: PluginCli.Command = {
  name: 'plugins',
  description: 'Commands related to the plugins of the cli',
  commands: [listPluginsCommand, searchPluginsCommand],
}
