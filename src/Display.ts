export interface Display {
  debug(...args: any[]): void
  info(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
}

export enum DisplayLevel {
  Silent = 0,
  Normal = 30,
  Verbose = 40
}

// istanbul ignore next
export class ConsoleDisplay implements Display {
  debug(...args: any[]): void {
    // tslint:disable-next-line: no-console
    console.log.apply(console, args)
  }
  info(...args: any[]): void {
    console.info.apply(console, args)
  }
  warn(...args: any[]): void {
    console.warn.apply(console, args)
  }
  error(...args: any[]): void {
    console.error.apply(console, args)
  }
}
