import { builder } from './builder'
import { cli } from './cli'
import * as tu from './test-utils'
import { getLogMessage, testCommandContext } from './test-utils'

export async function testCommand(command: cli.Command, argv: string, config?: Record<string, any>) {
  const ctx = testCommandContext(config)
  const result = await builder(ctx, { name: 'test-cli' }).command(command).parse(tu.argv(`test-cli ${argv}`))
  const messages = getLogMessage(ctx.reporter)
  return { result, messages }
}
