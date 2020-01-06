import { createPluginCommand } from './createPluginCommand'
import { listPluginsCommand } from './listPluginsCommand'
import { searchPluginsCommand } from './searchPluginsCommand'

export const pluginsCommand = createPluginCommand({
  name: 'plugins',
  description: 'Commands related to the plugins of the cli',
  commands: [listPluginsCommand, searchPluginsCommand],
})
