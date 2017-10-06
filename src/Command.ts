import { LogPresenter, HelpPresenter } from './Presenter'
export namespace Command {
  /**
   * This interface is shared between `CommandSpec` and `Command`
   */
  export interface Shared<Context> {
    /**
     * Name of the command.
     */
    name: string
    arguments?: Argument[]
    description?: string
    options?: {
      boolean?: BooleanOptions,
      string?: StringOptions
    }
    alias?: string[]
    run?: (this: Command & Context, args: { _: string[], [name: string]: any }, argv: string[]) => void | Promise<any>
  }

  export interface Options {
    boolean?: BooleanOptions,
    string?: StringOptions
  }
}

export interface CommandBase {
  name: string
  parent?: CommandBase
}

export interface Command<Context = {}> extends CommandBase, Command.Shared<Context> {
  cwd: string
  commands?: Command[]
  options: Command.Options
  ui: LogPresenter & HelpPresenter
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
    default?: boolean,
    /**
     * An option group this option belongs to.
     * If the option belongs to a group and one of the options has be set,
     * the other options will not have their default value.
     */
    group?: string
  }
}

export interface StringOptions {
  [optionName: string]: {
    description: string
    alias?: string[]
    default?: string,
    /**
     * An option group this option belongs to.
     * If the option belongs to a group and one of the options has be set,
     * the other options will not have their default value.
     */
    group?: string
  }
}

export interface CommandSpec<Context = {}> extends Command.Shared<Context> {
  commands?: CommandSpec[]
}
