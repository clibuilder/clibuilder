import { UI } from './UI'
import { Command } from './interfaces'
export interface Options {
  name: string,
  commands: Command[]
}
export class Program {
  ui: UI
  commands: Command[]
  constructor(options: Options) {
    this.ui = new UI(options)
    this.commands = options.commands
  }
  getCommandAndAliasNames() {
    return []
  }

  execute(_commandName: string, ..._args: any[]) {
    return
  }
}
