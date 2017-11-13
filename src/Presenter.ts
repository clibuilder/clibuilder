import inquirer = require('inquirer')
import { CliCommand } from './CliCommand'
import { DisplayLevel } from './Display'

export interface CommandModel extends CliCommand.Base {
  description?: string
  commands?: CommandModel[]
  arguments?: CliCommand.Argument[],
  alias?: string[]
  options?: CliCommand.Options
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

export interface Inquirer {
  prompt(questions: inquirer.Question[]): Promise<inquirer.Answers>
}
