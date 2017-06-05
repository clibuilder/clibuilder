import { Appender, Logger } from 'aurelia-logging'

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
