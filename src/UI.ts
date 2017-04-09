import { getLogger, Logger } from 'aurelia-logging'
export interface Options {
  name: string
}
export class UI {
  log: Logger
  constructor(options: Options) {
    this.log = getLogger(options.name)
  }
}
