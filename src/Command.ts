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
    string?: StringOptions,
    group?: { [name: string]: string[] }
  }
  alias?: string[]
  run?: (this: Command, args: { _: string[], [name: string]: any }, argv: string[]) => void
}

export namespace Command {
  export interface Options {
    boolean?: BooleanOptions,
    string?: StringOptions,
    /**
     * An option group this option belongs to.
     * If the option belongs to a group and one of the options has be set,
     * the other options will not have their default value.
     */
    group?: { [name: string]: string[] }
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
