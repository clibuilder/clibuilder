import { LogPresenter, HelpPresenter, PromptPresenter } from './Presenter'

export interface CommandSpec {
  /**
   * Name of the command.
   */
  name: string
  arguments?: Argument[]
  commands?: Command[]
  description?: string
  prompts?: InquirerPrompts[]
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
  ui: LogPresenter & HelpPresenter & PromptPresenter
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


export interface InquirerPrompts {
  type: string,
  message: string,
  name: string,
  mask?: string,
  validate?: Function,
  choices?: string[],
  filter?: Function,
  paginated?: boolean,
  default?: Function,
}

