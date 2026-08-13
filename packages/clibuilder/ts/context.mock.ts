import { type LogLevel, logLevels } from 'standard-log'
import { createStandardLogForTest, type StandardLogForTest } from 'standard-log/testing'
import tmp from 'tmp'
import { required } from 'type-plus'
import { type ConfigLoadResult, resolveConfig } from './config.js'
import type { Context } from './context.js'
import { loadPlugins } from './plugins.js'
import type { RegistryOwner } from './registry.js'
import { getFixturePath } from './test-utils/index.js'
import { createBuilderUI, createUI } from './ui.js'

export namespace mockContext {
	export type Params = { fixtureDir?: string; logLevel?: LogLevel }
}

export function mockContext(
	params?: mockContext.Params
): Context & { sl: StandardLogForTest; readonly exitCode: number | undefined } {
	const { fixtureDir, logLevel } = required({ logLevel: logLevels.debug }, params)
	const cwd = fixtureDir ? getFixturePath(fixtureDir) : tmp.dirSync().name
	const sl = createStandardLogForTest({ logLevel })
	let exitCode: number | undefined
	return {
		async loadConfig(configName: string) {
			return (await this.resolveConfig(configName)).config
		},
		async resolveConfig(configName: string): Promise<ConfigLoadResult> {
			return resolveConfig({ cwd, ui: this.ui }, configName)
		},
		async loadPlugins(pluginNames: string[], registry: RegistryOwner, host: { name: string; version: string }) {
			return loadPlugins({ cwd, ui: this.ui, registry, host }, pluginNames)
		},
		cwd,
		/**
		 * Records the code instead of touching `process.exitCode`,
		 * so a test can assert the cli failed without failing the test run.
		 * It is also reported through `ui` so the exit shows up in the log messages.
		 */
		exit: function (this: any, code?: number) {
			exitCode = code
			this.ui.error(code === undefined ? 'exit' : `exit with ${code}`)
		} as any,
		get exitCode() {
			return exitCode
		},
		createCommandUI(id: string) {
			return createUI(sl.getLogger(id))
		},
		ui: createBuilderUI(createUI(sl.getLogger('clibuilder'))),
		sl
	}
}
