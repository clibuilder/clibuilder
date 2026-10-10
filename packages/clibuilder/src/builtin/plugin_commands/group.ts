import { command } from '../../command/define.js'
import { listPluginsCommand } from './list.js'
import { searchPluginsCommand } from './search.js'

export const pluginsCommand = command({
	name: 'plugins',
	description: 'Commands related to the plugins of the cli',
	commands: [listPluginsCommand, searchPluginsCommand]
})
