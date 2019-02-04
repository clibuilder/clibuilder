import inquirer = require('inquirer')
import { CliCommand } from '../cli-command'
import { DisplayLevel } from './Display'

export interface CommandModel {
  name: string
  description?: string
  commands?: CommandModel[]
  arguments?: CliCommand.Argument[],
  alias?: string[]
  options?: CliCommand.Options,
  parent?: { name: string }
}

export interface LogPresenter {
  displayLevel: DisplayLevel
  /**
   * Set display level.
   * @deprecated use displayLevel directly
   */
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
