import { Writable } from 'node:stream'
import { builder } from '../app/builder.js'
import type { cli } from '../cli.js'
import { configExtension } from '../config/extension.js'
import { mockContext } from '../drivers/context.mock.js'
import * as tu from '../test-utils/index.js'

export namespace testCommand {
	export type Options = {
		/**
		 * The config the command receives, validated against its `config` schema.
		 */
		config?: Record<string, any> | undefined
		/**
		 * The cli's output mode, as `cli({ output })` takes it: `'axi'` (default) or `'console'`.
		 */
		output?: cli.Output | undefined
		/**
		 * The cli's default format, as `cli({ format })` takes it: `'toon'` (default), `'json'` or `'text'`.
		 */
		format?: cli.Format | undefined
	}
}

/**
 * Runs `command` in a cli named `test-cli`, version `1.0.0`, with `argv` after the binary.
 * A `.default()` command runs the same way, with `argv` holding only its arguments.
 *
 * `messages` holds everything the cli wrote, stdout and stderr together, in the order it was written:
 * in the default `axi` output that includes the printed answer, such as a returned value or a `CliError` report.
 */
export async function testCommand(
	command: cli.Command | cli.Command.DefaultCommand,
	argv: string,
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

	const { config } = options
	const host = builder(ctx, { name: 'test-cli', version: '1.0.0', output: options.output, format: options.format })
		// the given config, validated as `config()` validates a loaded one. No `--show-config`: nothing was looked up
		.use(configExtension(async () => ({ config, source: { type: 'none' }, candidates: [] }), { showConfig: false }))
	const result = await ('name' in command ? host.command(command) : host.default(command)).parse(
		tu.argv(`test-cli ${argv}`)
	)
	// one entry per line, as `testCommand` has always returned them
	const messages = output.replace(/\n$/, '')
	// `undefined` when the command did not fail, matching a process that exits 0.
	return { result, messages, exitCode: ctx.exitCode }
}
