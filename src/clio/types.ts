export type UI = {
  displayLevel: DisplayLevel,
  info(...args: any[]): void,
  warn(...args: any[]): void,
  error(...args: any[]): void,
  debug(...args: any[]): void,
  showHelp(): void,
  showVersion(): void,
}

export type DisplayLevel = 'none' | 'info' | 'debug' | 'trace'
