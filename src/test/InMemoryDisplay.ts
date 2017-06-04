import { Display } from '../interfaces'

export class InMemoryDisplay implements Display {
  debugMessages: any[] = []
  infoMessages: any[] = []
  warnMessages: any[] = []
  errorMessages: any[] = []
  debug(...args: any[]): void {
    this.debugMessages.push(args)
  }
  info(...args: any[]): void {
    this.infoMessages.push(args)
  }
  warn(...args: any[]): void {
    this.warnMessages.push(args)
  }
  error(...args: any[]): void {
    this.errorMessages.push(args)
  }
}
