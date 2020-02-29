import { logLevel } from 'standard-log'
import { Cli } from '../cli/types'
import Enquirer from './enquirer-types'

export interface Display {
  debug(...args: any[]): void,
  info(...args: any[]): void,
  warn(...args: any[]): void,
  error(...args: any[]): void,
}

export enum DisplayLevel {
  Silent = logLevel.none,
  Normal = logLevel.info,
  Verbose = logLevel.debug
}

// istanbul ignore next
export class ConsoleDisplay implements Display {
  debug(...args: any[]): void {
    console.info(...args)
  }
  info(...args: any[]): void {
    console.info(...args)
  }
  warn(...args: any[]): void {
    console.warn(...args)
  }
  error(...args: any[]): void {
    console.error(...args)
  }
}

export interface CommandModel {
  name: string,
  description?: string,
  commands?: CommandModel[],
  arguments?: Cli.Argument<any>[],
  alias?: string[],
  options?: Cli.Options,
  parent?: { name: string },
}

export interface LogPresenter {
  displayLevel: DisplayLevel,
  /**
   * Set display level.
   * @deprecated use displayLevel directly
   */
  setDisplayLevel(displayLevel: DisplayLevel): void,
  info(...args: any[]): void,
  warn(...args: any[]): void,
  error(...args: any[]): void,
  debug(...args: any[]): void,
}

export interface HelpPresenter {
  showHelp(command: CommandModel): void,
}
export interface VersionPresenter {
  showVersion(version: string): void,
}

export interface PresenterOption {
  name: string,
}

export type PromptPresenter = {
  prompt(questions: Enquirer.prompt.Question[]): Promise<Record<string, any>>
}
