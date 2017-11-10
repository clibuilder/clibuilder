import { LogPresenter, HelpPresenter, Inquirer } from './Presenter'
export namespace Command {

  export interface Base {
    name: string
    parent?: Base
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
      default?: string
      /**
       * An option group this option belongs to.
       * If the option belongs to a group and one of the options has be set,
       * the other options will not have their default value.
       */
      group?: string
    }
  }

  export interface NumberOption {
    [optionName: string]: {
      description: string
      alias?: string[]
      default?: string
    }
  }

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
    run?: (this: Instance & Context, args: { _: string[], [name: string]: any }, argv: string[]) => void | Promise<any>
  }

  export interface Options {
    boolean?: BooleanOptions,
    string?: StringOptions
  }

  export interface Instance<Context = {}> extends Base, Shared<Context> {
    cwd: string
    commands?: Instance[]
    options: Options
    ui: LogPresenter & HelpPresenter & Inquirer
    run: (this: Instance & Context, args: { _: string[], [name: string]: any }, argv: string[]) => void | Promise<any>
  }
}

export interface Command<Context = {}> extends Command.Shared<Context> {
  commands?: Command[]
}
