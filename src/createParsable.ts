import {
  CliCommand,
  // @ts-ignore
  CliCommandInstance
} from './CliCommand/CliCommand'
import { InMemoryPresenterFactory } from './test-util/index'
import { createCliCommand } from './CliCommand/createCliCommand'

export function createParsable(command: CliCommand, context = {}) {
  return createCliCommand(command, { context: { presenterFactory: new InMemoryPresenterFactory(), ...context } })
}
