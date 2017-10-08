import { Command } from './Command'
import { DisplayLevel } from './Display'

export interface CommandModel extends Command.Base {
  description?: string
  commands?: CommandModel[]
  arguments?: Command.Argument[],
  alias?: string[]
  options?: Command.Options
}

export interface LogPresenter {
  setDisplayLevel(displayLevel: DisplayLevel): void
  info(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
  debug(...args: any[]): void
}

export interface HelpPresenter {
  showHelp(command: CommandModel): void
}
export interface VersionPresenter {
  showVersion(version: string): void
}

export interface PresenterOption {
  name: string
}
