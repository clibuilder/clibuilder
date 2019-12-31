import { CliCommand, createCliCommand } from '../cli-command'
import { InMemoryPresenterFactory } from '../test-util'

export function createParsable(command: CliCommand, context = {}) {
  return createCliCommand(command, { context: { presenterFactory: new InMemoryPresenterFactory(), ...context } })
}
