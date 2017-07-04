import { LogPresenter, HelpPresenter } from './Presenter'

export interface CommandSpec {
  /**
   * Name of the command.
   */
  name: string
  arguments?: Argument[]
  commands?: Command[]
  description?: string
  options?: {
    boolean?: BooleanOptions,
    string?: StringOptions
  }
  alias?: string[]
  run?: (this: Command, args: { _: string[], [name: string]: any }, argv: string[]) => void
}

export namespace Command {
  export interface Options {
    boolean?: BooleanOptions,
    string?: StringOptions
  }
}

export interface CommandBase {
  name: string
  parent?: CommandBase
}

export interface Command extends CommandBase, CommandSpec {
  cwd: string
  options: Command.Options
  ui: LogPresenter & HelpPresenter
  run(this: Command, args: { _: string[], [name: string]: any }, argv: string[]): Promise<void>
}

export interface Argument {
  name: string,
  description?: string
  required?: boolean
  multiple?: boolean
}

export interface BooleanOptions {
  [optionName: string]: {
    description: string
    alias?: string[]
    default?: boolean
  }
}

export interface StringOptions {
  [optionName: string]: {
    description: string
    alias?: string[]
    default?: string
  }
}
