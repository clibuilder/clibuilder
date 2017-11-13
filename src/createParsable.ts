import {
  CliCommand,
  // @ts-ignore
  CliCommandInstance
} from './CliCommand'
import { InMemoryPresenterFactory } from './test-util/index'
import { createCommand } from './util'

export function createParsable(command: CliCommand, context = {}) {
  return createCommand(command, new InMemoryPresenterFactory(), context)
}
