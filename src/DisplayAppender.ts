import { Appender, Logger, addAppender } from 'aurelia-logging'

import store from './store'

export class DisplayAppender implements Appender {
  debug(_logger: Logger, ...rest: any[]): void {
    console.log.apply(console, rest)
  }
  info(_logger: Logger, ...rest: any[]): void {
    console.info.apply(console, rest)
  }
  warn(_logger: Logger, ...rest: any[]): void {
    console.warn.apply(console, rest)
  }
  error(_logger: Logger, ...rest: any[]): void {
    console.error.apply(console, rest)
  }
}

export { Appender, Logger }

export function setAppender(appender: Appender) {
  if (store.isAppenderSet) {
    throw new Error('Cannot set Appender twice')
  }
  addAppender(appender)
  store.isAppenderSet = true
}
