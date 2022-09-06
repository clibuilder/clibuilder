import { builder } from './builder.js'
import { cli } from './cli.js'
import * as tu from './test-utils/index.js'
import { getLogMessage, testCommandContext } from './test-utils/index.js'

export async function testCommand(command: cli.Command, argv: string, config?: Record<string, any>) {
  const ctx = testCommandContext(config)
  const result = await builder(ctx, { name: 'test-cli' }).command(command).parse(tu.argv(`test-cli ${argv}`))
  const messages = getLogMessage(ctx.reporter)
  return { result, messages }
}
