// import { Omit, T } from 'type-plus'
import { clibuilder } from './clibuilder'
import { createAppContext } from './createAppContext'

export function cli(): clibuilder.Builder
export function cli(options: cli.Options): clibuilder.BuilderWithOptions
export function cli(options?: cli.Options) {
  const ctx = createAppContext()
  return options ? clibuilder(ctx, options) : clibuilder(ctx)
}

export namespace cli {
  export type Options = {
    /**
     * Name of the cli
     */
    name: string,
    version: string,
    description: string,
  }
  export type Command = {}

  //   export type ConfigOptions<T extends T.AllType> = {
  //     /**
  //      * Name of the config file to load.
  //      * Defaults to the name of the cli package (not the bin).
  //      * You can specify the exact file name,
  //      * or it will automatically look for the following:
  //      *
  //      * `{name}.json`
  //      * `.{name}rc`
  //      * `.{name}rc.json
  //      */
  //     name?: string,
  //     /**
  //      * Describe the shape of the config,
  //      * using `T` from `type-plus`.
  //      */
  //     type: T
  //   }

  //   export type UI = {
  //     displayLevel: DisplayLevel,
  //     info(...args: any[]): void,
  //     warn(...args: any[]): void,
  //     error(...args: any[]): void,
  //     debug(...args: any[]): void,
  //     showHelp(): void,
  //     showVersion(): void,
  //   }

  //   export type DisplayLevel = 'none' | 'info' | 'debug' | 'trace'

  //   export type Builder<Config> = {
  //     readonly name: string,
  //     readonly version?: string,
  //     readonly description?: string,
  //     readonly config: Config,
  //     loadConfig<
  //       ConfigType extends T.AllType,
  //       This extends Partial<Builder<any>>
  //     >(
  //       this: This,
  //       options: cli.ConfigOptions<ConfigType>
  //     ): Omit<typeof this, 'loadConfig' | 'config'> & { config: T.Generate<ConfigType> },
  //     loadPlugins<
  //       This extends Partial<Builder<any>>
  //     >(this: This): Omit<typeof this, 'loadPlugins'>,
  //     /**
  //      * Default command when no sub-command matches.
  //      */
  //     default<
  //       This extends Partial<Builder<any>>
  //     >(this: This, command: Omit<Command<This['config']>, 'name'>):
  //       Omit<typeof this, 'default'> & Executable<This['config']>,
  //     addCommands<
  //       This extends Partial<Builder<any>>
  //     >(this: This, commands: Command<This['config']>[]): typeof this
  //   }

  //   export type Executable<Config> = {
  //     parse<R = any>(this: Executable.This<Config>, argv: string[]): Promise<R>
  //   }

  //   export namespace Executable {
  //     export type This<Config> = Pick<Builder<Config>, 'config'> & { description: string }
  //   }

  //   export type Command<
  //     Config extends Record<string, any> = any,
  //     A extends Command.Argument[] = Command.Argument[],
  //     B extends Record<string, Command.TypedOptions<boolean>> = Record<string, Command.TypedOptions<boolean>>,
  //     S extends Record<string, Command.TypedOptions<string>> = Record<string, Command.TypedOptions<string>>,
  //     N extends Record<string, Command.TypedOptions<number>> = Record<string, Command.TypedOptions<number>>,
  //     O extends Command.Options<B, S, N> = Command.Options<B, S, N>
  //     > = {
  //       name: string,
  //       description?: string,
  //       arguments?: A,
  //       options?: O,
  //       run(this: {
  //         ui: cli.UI,
  //         config: Config
  //       }, args: any): any
  //     }

  //   export namespace Command {
  //     export type Argument<Name extends string = string> = {
  //       name: Name,
  //       description?: string,
  //       required?: boolean,
  //       multiple?: boolean,
  //     }

  //     export type Options<
  //       B extends Record<string, Command.TypedOptions<boolean>> = Record<string, Command.TypedOptions<boolean>>,
  //       S extends Record<string, Command.TypedOptions<string>> = Record<string, Command.TypedOptions<string>>,
  //       N extends Record<string, Command.TypedOptions<number>> = Record<string, Command.TypedOptions<number>>
  //       > = { boolean?: B, string?: S, number?: N }

  //     export type TypedOptions<T> = {
  //       description: string,
  //       alias?: string[],
  //       default?: T,
  //     }
  //   }
}
