import { createConsoleLogReporter, createStandardLog, logLevels } from 'standard-log'
import { createColorLogReporter } from 'standard-log-color'
import type { Command } from './command.internal.types.js'
import { loadConfig } from './config.js'
import { loadPlugins } from './plugins.js'
import { createBuilderUI, createUI } from './ui.js'

/**
 * Creates an app context that provides interactions to external system
 * This
 */
export function context() {
	const cwd = process.cwd()
	// default log level to debug to capture debug cli logs.
	// When `--debug-cli` is supplied, the logs will be made to UI.
	const sl = createStandardLog({
		logLevel: logLevels.all,
		reporters: [createConsoleLogReporter()]
	})
	let config: any
	let loadingCommands: Promise<Command[]>
	return {
		async loadConfig(configName: string) {
			if (config) return config
			return (config = await loadConfig({ cwd, ui: this.ui }, configName))
		},
		// ignoring coverage. Test are done through `@unional/fixture` `execCommand()`
		// istanbul ignore next
		async loadPlugins(pluginNames: string[]) {
			if (loadingCommands) return loadingCommands
			return (loadingCommands = loadPlugins({ cwd, ui: this.ui }, pluginNames))
		},
		cwd,
		exit: process.exit,
		createCommandUI(id: string) {
			return createUI(sl.getLogger(id))
		},
		ui: createBuilderUI(createUI(sl.getLogger('clibuilder', { writeTo: createColorLogReporter() })))
	}
}

export type Context = ReturnType<typeof context>
