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

/** Creates the app context: the built-in ui writing to `streams` as `output` routes it. */
export function context(options: context.Options = {}): Context {
	const cwd = process.cwd()
	const sinks = createSinks(options.streams ?? { stdout: process.stdout, stderr: process.stderr })
	const output = options.output ?? 'axi'
	return {
		cwd,
		// not `process.exit()`, which would truncate what is still buffered on stdout
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
 * What the framework needs from the outside world: a working directory, somewhere to log, and a way to end.
 *
 * Declared, not derived from `context()` with `ReturnType`: a port taken from one implementation
 * is not a contract for the other (`context.mock.ts`).
 */
export type Context = {
	readonly cwd: string
	/** Records the code the cli should exit with, rather than ending the process. */
	exit(code?: number): void
	/** Writes text to stdout as given, with no logger or formatting in between. */
	writeStdout(text: string): void
	createCommandUI(id: string): createUI.UI
	ui: BuilderUI
}
