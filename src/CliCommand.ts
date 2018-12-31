import { CliArgs } from './interfaces'
import { LogPresenter, HelpPresenter, Inquirer } from './Presenter'

export namespace CliCommand {
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
      /**
       * An option group this option belongs to.
       * If the option belongs to a group and one of the options has be set,
       * the other options will not have their default value.
       */
      group?: string
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
  export interface Shared {
    /**
     * Name of the command.
     */
    name: string
    arguments?: Argument[]
    description?: string
    options?: Options
    alias?: string[]
    ui?: LogPresenter & HelpPresenter & Inquirer
  }
}

export interface CliCommandInstance<Config = any, Context = { [k: string]: any }> extends CliCommand.Base, CliCommand.Shared {
  cwd: string
  commands?: CliCommandInstance[]
  config?: Config
  ui: LogPresenter & HelpPresenter & Inquirer
  run(this: CliCommandInstance & Context & { config?: Config }, args: CliArgs, argv: string[]): void | Promise<any>
}

export interface CliCommand<Config = any, Context extends Record<string, any> = Record<string, any>> extends CliCommand.Shared {
  commands?: CliCommand[],
  run?: (this: CliCommandInstance & Context & { config?: Config }, args: CliArgs, argv: string[]) => void | Promise<any>
}
