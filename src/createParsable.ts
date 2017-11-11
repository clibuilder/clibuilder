import { Command } from './Command'
import { InMemoryPresenterFactory } from './test-util/index'
import { createCommand } from './util'

export function createParsable(command: Command, context) {
  return createCommand(command, new InMemoryPresenterFactory(), context)
}
