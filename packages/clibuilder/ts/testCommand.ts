import { logLevels } from 'standard-log'
import { builder } from './builder.js'
import { cli } from './cli.js'
import { mockContext } from './context.mock.js'
import * as tu from './test-utils/index.js'
import { getLogMessage } from './test-utils/index.js'

export async function testCommand(command: cli.Command, argv: string, config?: Record<string, any>) {
  const ctx = mockContext({ logLevel: logLevels.info })

  ctx.loadConfig = async () => config
  const result = await builder(ctx, { name: 'test-cli', version: '1.0.0' }).command(command).parse(tu.argv(`test-cli ${argv}`))
  const messages = getLogMessage(ctx.sl.reporter)
  return { result, messages }
}
