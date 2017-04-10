import { Command, createLogger, Logger } from '../index'

export class SimpleCommand implements Command {
  name: 'simple'
  log: Logger
  constructor() {
    this.log = createLogger('SimpleCommand')
  }
  run(_argv: string[]) {
    return
  }
}
