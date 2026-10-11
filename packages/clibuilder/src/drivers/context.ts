import { type ConfigLoadResult, resolveConfig } from '../config.js'
import type { Output, Streams } from '../core/ports.js'
import { type BuilderUI, createBuilderUI, type createUI } from './logger.js'
import { createStreamUI } from './stream_ui.js'
import { createSinks } from './streams.js'

export namespace context {
	export type Options = {
		streams?: Streams | undefined
		output?: Output | undefined
	}
}

/**
 * Creates an app context that provides interactions to external system
 *
 * The ui is the built-in one, writing to `streams` (`process.stdout` and `process.stderr` by default)
 * as `output` routes it.
 */
export function context(options: context.Options = {}): Context {
	const cwd = process.cwd()
	const sinks = createSinks(options.streams ?? { stdout: process.stdout, stderr: process.stderr })
	const output = options.output ?? 'axi'
	// the resolution is cached as a promise so concurrent callers share one filesystem walk,
	// and so a config that is legitimately falsy is not re-resolved on every call.
	let resolvingConfig: Promise<ConfigLoadResult>
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
		writeStdout(text: string) {
			sinks.stdout.write(text)
		},
		createCommandUI() {
			return createStreamUI(sinks, output)
		},
		ui: createBuilderUI(createStreamUI(sinks, output))
	}
}

/**
 * What the framework needs from the outside world: a working directory, the
 * config loading it defers, somewhere to log, and a way to end.
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
	/**
	 * Records the code the cli should exit with, rather than ending the process.
	 */
	exit(code?: number): void
	/**
	 * Writes text to stdout as given, with no logger or formatting in between.
	 */
	writeStdout(text: string): void
	createCommandUI(id: string): createUI.UI
	ui: BuilderUI
}
