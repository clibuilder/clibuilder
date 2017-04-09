import events = require('events')

export abstract class Command {
  name: string
}
export interface Options {
  name: string,
  commands: Command[]
}
export class Program {
  emitter: events.EventEmitter
  map: { [name: string]: Command }
  constructor(options: Options) {
    this.emitter = new events.EventEmitter()
    options.commands
  }

  execute(commandName: string, ...args: any[]) {
    this.emitter.emit('execute', commandName, ...args)

    return
  }
}
