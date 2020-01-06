import { PluginCli2 } from '../plugin-cli/types'
import { listPluginsCommand } from './listPluginsCommand'
import { searchPluginsCommand } from './searchPluginsCommand'

export const pluginsCommand: PluginCli2.Command = {
  name: 'plugins',
  description: 'Commands related to the plugins of the cli',
  commands: [listPluginsCommand, searchPluginsCommand],
}
