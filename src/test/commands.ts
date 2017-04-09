import events = require('events')

import { Command } from '../Command'


export class SimpleCommand implements Command {
  constructor(public emitter: events.EventEmitter) { }
  run() {

  }
}
