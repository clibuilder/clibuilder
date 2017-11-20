import {
  CliCommand,
  // @ts-ignore
  CliCommandInstance
} from './CliCommand'
import { InMemoryPresenterFactory } from './test-util/index'
import { createCliCommand } from './createCliCommand'

export function createParsable(command: CliCommand, context = {}) {
  return createCliCommand(command, new InMemoryPresenterFactory(), context)
}
