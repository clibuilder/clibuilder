import { CliCommand } from '../cli-command';

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
    console.log.apply(console, args as any)
  }
  info(...args: any[]): void {
    console.info.apply(console, args as any)
  }
  warn(...args: any[]): void {
    console.warn.apply(console, args as any)
  }
  error(...args: any[]): void {
    console.error.apply(console, args as any)
  }
}

export interface PresenterFactory {
  createCliPresenter(options: PresenterOption): LogPresenter & HelpPresenter & VersionPresenter
  createCommandPresenter(options: PresenterOption): LogPresenter & HelpPresenter & Inquirer,
}
import inquirer = require('inquirer')

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
