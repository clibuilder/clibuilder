import { Writable } from 'node:stream'
import { builder } from '../app/builder.js'
import type { cli } from '../cli.js'
import { mockContext } from '../drivers/context.mock.js'
import * as tu from '../test-utils/index.js'

export async function testCommand(command: cli.Command, argv: string, config?: Record<string, any>) {
	// stdout and stderr share one buffer, so `messages` keeps the order things were said in
	let output = ''
	const stream = new Writable({
		decodeStrings: false,
		write(chunk, _encoding, callback) {
			output += chunk
			callback()
		}
	})
	const ctx = mockContext({ streams: { stdout: stream, stderr: stream } })

	ctx.loadConfig = async () => config
	const result = await builder(ctx, { name: 'test-cli', version: '1.0.0' })
		.command(command)
		.parse(tu.argv(`test-cli ${argv}`))
	// one entry per line, as `testCommand` has always returned them
	const messages = output.replace(/\n$/, '')
	// `undefined` when the command did not fail, matching a process that exits 0.
	return { result, messages, exitCode: ctx.exitCode }
}
