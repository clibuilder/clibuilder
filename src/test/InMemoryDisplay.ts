import { Display, PlainReportPresenter } from '../index'

export function generateDisplayedMessage(entries: string[][]) {
  return entries.map(e => e.join(' ')).join('\n')
}

export class InMemoryDisplay implements Display {
  errorLogs: any[][] = []
  warnLogs: any[][] = []
  infoLogs: any[][] = []
  debugLogs: any[][] = []
  debug(...args: any[]): void {
    this.debugLogs.push(args)
  }
  info(...args: any[]): void {
    this.infoLogs.push(args)
  }
  warn(...args: any[]): void {
    this.warnLogs.push(args)
  }
  error(...args: any[]): void {
    this.errorLogs.push(args)
  }
}
export class InMemoryPresenter extends PlainReportPresenter {
  display = new InMemoryDisplay()
}
