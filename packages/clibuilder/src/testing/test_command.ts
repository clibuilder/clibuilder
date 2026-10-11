import { logLevels } from 'standard-log'
import { builder } from '../app/builder.js'
import type { cli } from '../cli.js'
import { mockContext } from '../drivers/context.mock.js'
import * as tu from '../test-utils/index.js'

export async function testCommand(command: cli.Command, argv: string, config?: Record<string, any>) {
	const ctx = mockContext({ logLevel: logLevels.info })

	ctx.loadConfig = async () => config
	const result = await builder(ctx, { name: 'test-cli', version: '1.0.0' })
		.command(command)
		.parse(tu.argv(`test-cli ${argv}`))
	// `--version` alone is written straight to stdout rather than logged, so it is
	// read from there too, keeping it in `messages` as before.
	const messages = [ctx.stdout.replace(/\n$/, ''), ctx.sl.reporter.getLogMessage()].filter((m) => m).join('\n')
	// `undefined` when the command did not fail, matching a process that exits 0.
	return { result, messages, exitCode: ctx.exitCode }
}
