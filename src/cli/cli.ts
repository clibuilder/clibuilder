import { clibuilder } from './clibuilder'
import { createAppContext } from './createAppContext'

export function cli(options?: cli.Options) {
  return clibuilder(createAppContext(), options)
}

import { T } from 'type-plus'

export namespace cli {
  export type Options = {
    /**
     * Name of the cli
     */
    name: string,
    version?: string,
    description?: string,
  }

  export type ConfigOptions<T extends T.AllType> = {
    /**
     * Name of the config file to load.
     * Defaults to the name of the cli package (not the bin).
     * You can specify the exact file name,
     * or it will automatically look for the following:
     *
     * `{name}.json`
     * `.{name}rc`
     * `.{name}rc.json
     */
    name?: string,
    /**
     * Describe the shape of the config,
     * using `T` from `type-plus`.
     */
    type: T
  }

  export type UI = {
    displayLevel: DisplayLevel,
    info(...args: any[]): void,
    warn(...args: any[]): void,
    error(...args: any[]): void,
    debug(...args: any[]): void,
    showHelp(): void,
    showVersion(): void,
  }

  export type DisplayLevel = 'none' | 'info' | 'debug'

  export type Builder<Config> = {
    readonly name: string,
    readonly version?: string,
    readonly description?: string,
    readonly config: Config,
    loadConfig<
      ConfigType extends T.AllType,
      This extends Partial<Builder<any>>
    >(
      this: This,
      options: cli.ConfigOptions<ConfigType>
    ): Omit<typeof this, 'loadConfig' | 'config'> & { config: T.Generate<ConfigType> },
    loadPlugins<
      This extends Partial<Builder<any>>
    >(this: This): Omit<typeof this, 'loadPlugin'> & Executable<This['config']>,
    /**
     * Default command when no sub-command matches.
     */
    default<
      This extends Partial<Builder<any>>
    >(this: This, command: Omit<Command<This['config']>, 'name'>):
      Omit<typeof this, 'default'> & Executable<This['config']>,
    addCommands<
      This extends Partial<Builder<any>>
    >(this: This, commands: Command<This['config']>[]): (typeof this) & Executable<This['config']>
  }

  export type Executable<Config> = {
    parse<R = any>(this: Pick<Builder<Config>, 'config'>, argv: string[]): Promise<R>
  }

  export type Command<Config = any> = {
    name: string,
    description?: string,
    options?: any,
    run(this: {
      ui: cli.UI,
      config: Config
    }, args: any): any
  }

  export namespace Command {
    export type Options<
      BName extends string = string,
      SName extends string = string,
      NName extends string = string
      > = {
        boolean?: Record<BName, TypedOptions<boolean>>,
        string?: Record<SName, TypedOptions<string>>,
        number?: Record<NName, TypedOptions<number>>,
      }

    export type TypedOptions<T> = {
      description: string,
      alias?: string[],
      default?: T,
      /**
       * An option group this option belongs to.
       * If the option belongs to a group and one of the options has be set,
       * the other options will not have their default value.
       */
      group?: string,
    }
  }
}