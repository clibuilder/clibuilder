import { Writable } from 'node:stream'
import { builder } from '../app/builder.js'
import type { cli } from '../cli.js'
import { configExtension } from '../config/extension.js'
import { mockContext } from '../drivers/context.mock.js'
import * as tu from '../test-utils/index.js'

export namespace testCommand {
	export type Options = {
		/**
		 * The cli's output mode, as `cli({ output })` takes it: `'axi'` (default) or `'console'`.
		 */
		output?: cli.Output | undefined
	}
}

/**
 * Runs `command` in a cli named `test-cli`, version `1.0.0`, with `argv` after the binary.
 *
 * `messages` holds everything the cli wrote, stdout and stderr together, in the order it was written:
 * in the default `axi` output that includes the printed answer, such as a returned value or a `CliError` report.
 * Pass `{ output: 'console' }` to test a cli that uses `cli({ output: 'console' })`.
 */
export async function testCommand(
	command: cli.Command,
	argv: string,
	config?: Record<string, any>,
	options: testCommand.Options = {}
) {
	// stdout and stderr share one buffer, so `messages` keeps the order things were said in
	let output = ''
	const stream = new Writable({
		decodeStrings: false,
		write(chunk, _encoding, callback) {
			output += chunk
			callback()
		}
	})
	const ctx = mockContext({ streams: { stdout: stream, stderr: stream }, output: options.output })

	const result = await builder(ctx, { name: 'test-cli', version: '1.0.0', output: options.output })
		// the given config, validated as `config()` validates a loaded one. No `--show-config`: nothing was looked up
		.use(configExtension(async () => ({ config, source: { type: 'none' }, candidates: [] }), { showConfig: false }))
		.command(command)
		.parse(tu.argv(`test-cli ${argv}`))
	// one entry per line, as `testCommand` has always returned them
	const messages = output.replace(/\n$/, '')
	// `undefined` when the command did not fail, matching a process that exits 0.
	return { result, messages, exitCode: ctx.exitCode }
}
