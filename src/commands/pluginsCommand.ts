import { CliCommand } from '../cli-command'
import { listPluginsCommand } from './listPluginsCommand'
import { searchPluginsCommand } from './searchPluginsCommand'

export const pluginsCommand: CliCommand = {
  name: 'plugins',
  description: 'Commands related to the plugins of the cli',
  commands: [listPluginsCommand, searchPluginsCommand],
}
