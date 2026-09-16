import { createConsoleLogReporter, createStandardLog, logLevels } from 'standard-log'
import { createColorLogReporter } from 'standard-log-color'
import type { Command } from './command.internal.types.js'
import { type ConfigLoadResult, resolveConfig } from './config.js'
import { loadPlugins } from './plugins.js'
import type { RegistryOwner } from './registry.js'
import { type BuilderUI, createBuilderUI, createUI } from './ui.js'

/**
 * Creates an app context that provides interactions to external system
 * This
 */
export function context(): Context {
	const cwd = process.cwd()
	// default log level to debug to capture debug cli logs.
	// When `--debug-cli` is supplied, the logs will be made to UI.
	const sl = createStandardLog({
		logLevel: logLevels.all,
		reporters: [createConsoleLogReporter()]
	})
	// the resolution is cached as a promise so concurrent callers share one filesystem walk,
	// and so a config that is legitimately falsy is not re-resolved on every call.
	let resolvingConfig: Promise<ConfigLoadResult>
	let loadingCommands: Promise<Command[]>
	return {
		async loadConfig(configName: string) {
			return (await this.resolveConfig(configName)).config
		},
		/**
		 * Resolves the config along with where it came from.
		 */
		async resolveConfig(configName: string): Promise<ConfigLoadResult> {
			if (resolvingConfig) return resolvingConfig
			return (resolvingConfig = resolveConfig({ cwd, ui: this.ui }, configName))
		},
		// ignoring coverage. Test are done through `@unional/fixture` `execCommand()`
		// istanbul ignore next
		async loadPlugins(pluginNames: string[], registry: RegistryOwner, host: { name: string; version: string }) {
			if (loadingCommands) return loadingCommands
			return (loadingCommands = loadPlugins({ cwd, ui: this.ui, registry, host }, pluginNames))
		},
		cwd,
		/**
		 * Records the code the process should exit with.
		 *
		 * `process.exit()` would end the process on the spot and truncate whatever
		 * is still buffered on stdout, so the code is recorded instead and node
		 * exits with it once the cli is done and the event loop drains.
		 */
		exit(code?: number) {
			process.exitCode = code
		},
		createCommandUI(id: string) {
			return createUI(sl.getLogger(id))
		},
		ui: createBuilderUI(createUI(sl.getLogger('clibuilder', { writeTo: createColorLogReporter() })))
	}
}

/**
 * What the framework needs from the outside world: a working directory, the
 * config and plugin loading it defers, somewhere to log, and a way to end.
 *
 * Declared here rather than derived from `context()` with `ReturnType`. A port
 * taken from one implementation is not a contract — the other implementation
 * (`context.mock.ts`) then has to chase whatever this one happens to return,
 * and any change here silently redefines what a test double must be.
 */
export type Context = {
	readonly cwd: string
	loadConfig(configName: string): Promise<any>
	/**
	 * Resolves the config along with where it came from.
	 */
	resolveConfig(configName: string): Promise<ConfigLoadResult>
	loadPlugins(
		pluginNames: string[],
		registry: RegistryOwner,
		host: { name: string; version: string }
	): Promise<Command[]>
	/**
	 * Records the code the cli should exit with, rather than ending the process.
	 */
	exit(code?: number): void
	createCommandUI(id: string): createUI.UI
	ui: BuilderUI
}
