import { type LogLevel, logLevels } from 'standard-log'
import { createStandardLogForTest, type StandardLogForTest } from 'standard-log/testing'
import tmp from 'tmp'
import { required } from 'type-plus'
import { type ConfigLoadResult, resolveConfig } from '../config.js'
import type { Streams } from '../core/ports.js'
import { loadPlugins } from '../plugins/load.js'
import type { RegistryOwner } from '../plugins/registry.js'
import { getFixturePath } from '../test-utils/index.js'
import type { Context } from './context.js'
import { createBuilderUI, createUI } from './logger.js'
import { createStreamUI } from './stream_ui.js'
import { createSinks } from './streams.js'

export namespace mockContext {
	export type Params = {
		fixtureDir?: string
		logLevel?: LogLevel
		/**
		 * Writes through the built-in ui to these streams, in `console` mode,
		 * instead of recording into `sl`. `logLevel` is then not used, and `stdout` stays empty.
		 */
		streams?: Streams
	}
}

export function mockContext(
	params?: mockContext.Params
): Context & { sl: StandardLogForTest; readonly exitCode: number | undefined; readonly stdout: string } {
	const { fixtureDir, logLevel, streams } = required({ logLevel: logLevels.info }, params)
	const sinks = streams && createSinks(streams)
	const cwd = fixtureDir ? getFixturePath(fixtureDir) : tmp.dirSync().name
	const sl = createStandardLogForTest({ logLevel })
	let exitCode: number | undefined
	let stdout = ''

	/**
	 * A ui on a test logger, kept at the level the caller asked for.
	 *
	 * `createUI` sets every logger it wraps to `info` — that is the *production*
	 * display default, which `--verbose` and `--debug-cli` then raise. It also
	 * overrides the level the test store was built with, because standard-log
	 * prefers a logger's own level over the store's. So the level is re-applied
	 * here, after `createUI`, or `mockContext`'s `logLevel` would reach the store
	 * and never the loggers a test can actually see.
	 */
	function testUI(id: string) {
		if (sinks) return createStreamUI(sinks, 'console')
		const logger = sl.getLogger(id)
		const ui = createUI(logger)
		logger.level = logLevel
		return ui
	}

	const ui = createBuilderUI(testUI('clibuilder'))
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
		exit(code?: number) {
			exitCode = code
			ui.error(code === undefined ? 'exit' : `exit with ${code}`)
		},
		get exitCode() {
			return exitCode
		},
		writeStdout(text: string) {
			if (sinks) sinks.stdout.write(text)
			else stdout += text
		},
		/**
		 * Everything written through `writeStdout`, concatenated.
		 */
		get stdout() {
			return stdout
		},
		createCommandUI(id: string) {
			return testUI(id)
		},
		ui,
		sl
	}
}
