import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Output, Streams } from '../core/ports.js'
import { getFixturePath } from '../test-utils/index.js'
import type { Context } from './context.js'
import { createBuilderUI } from './logger.js'
import { createStreamUI } from './stream_ui.js'
import { createSinks, type Sinks } from './streams.js'

export namespace mockContext {
	export type Params = {
		fixtureDir?: string
		/**
		 * Writes through the built-in ui to these streams instead of recording into `messages`.
		 * `messages` and `stdout` then stay empty.
		 */
		streams?: Streams
		/**
		 * How the built-in ui routes its messages to `streams`: `'axi'` (default) or `'console'`.
		 * Pass the same value the cli under test gets as `output`.
		 */
		output?: Output
	}
}

export function mockContext(params: mockContext.Params = {}): Context & {
	readonly exitCode: number | undefined
	readonly stdout: string
	readonly messages: string
} {
	const { fixtureDir, streams, output = 'axi' } = params
	let messages = ''
	const sinks: Sinks = streams
		? createSinks(streams)
		: {
				stdout: { colour: false, write: (text) => void (messages += text) },
				stderr: { colour: false, write: (text) => void (messages += text) }
			}
	const cwd = fixtureDir ? getFixturePath(fixtureDir) : mkdtempSync(join(tmpdir(), 'clibuilder-'))
	let exitCode: number | undefined
	let stdout = ''

	/**
	 * The built-in ui in the given `output` mode, at the production display default `info`,
	 * which `--verbose` and `--debug-cli` then raise.
	 */
	function testUI() {
		return createStreamUI(sinks, output)
	}

	const ui = createBuilderUI(testUI())
	return {
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
			if (streams) sinks.stdout.write(text)
			else stdout += text
		},
		/**
		 * Everything written through `writeStdout`, concatenated.
		 */
		get stdout() {
			return stdout
		},
		/**
		 * Every line the ui wrote, from the framework and from commands, in the order it was said.
		 * One line per message, with no trailing newline.
		 */
		get messages() {
			return messages.replace(/\n$/, '')
		},
		createCommandUI() {
			return testUI()
		},
		ui
	}
}
