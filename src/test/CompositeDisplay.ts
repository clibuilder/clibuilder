import { Display } from '../Display'

export class CompositeDisplay implements Display {
  displays: Display[]
  constructor(...displays: Display[]) {
    this.displays = displays
  }
  debug(...args: any[]): void {
    this.displays.forEach(d => d.debug(...args))
  }
  info(...args: any[]): void {
    this.displays.forEach(d => d.info(...args))
  }
  warn(...args: any[]): void {
    this.displays.forEach(d => d.warn(...args))
  }
  error(...args: any[]): void {
    this.displays.forEach(d => d.error(...args))
  }
  prompt(..._args: any[]): any { }
}
