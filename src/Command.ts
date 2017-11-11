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

  export interface NumberOptions {
    [optionName: string]: {
      description: string
      alias?: string[]
      default?: number
    }
  }

  export interface Options {
    boolean?: BooleanOptions,
    string?: StringOptions,
    number?: NumberOptions
  }

  /**
   * This interface is shared between `CommandSpec` and `Command`
   */
  export interface Shared<Config = {}, Context = {}> {
    /**
     * Name of the command.
     */
    name: string
    arguments?: Argument[]
    description?: string
    options?: Options
    alias?: string[]
    run?: (this: Instance & Context & { config?: Config }, args: { _: string[], _defaults: string[], [name: string]: any }, argv: string[]) => void | Promise<any>
  }

  export interface Instance<Config = {}, Context = {}> extends Base, Shared<Config, Context> {
    cwd: string
    commands?: Instance[]
    config?: Config
    ui: LogPresenter & HelpPresenter & Inquirer
    run: (this: Instance & Context & { config?: Config }, args: { _: string[], _defaults: string[], [name: string]: any }, argv: string[]) => void | Promise<any>
  }
}

export interface Command<Config = {}, Context = {}> extends Command.Shared<Config, Context> {
  commands?: Command[]
}
