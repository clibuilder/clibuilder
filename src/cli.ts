import { HasKey, UnionOfValues } from 'type-plus'
import * as z from 'zod'
import { builder } from './builder'
import { context } from './context'

export function cli(options?: cli.Options): cli.Builder {
  return builder(context(), options)
}

export namespace cli {
  export type Options = {
    /**
     * Name of the cli
     */
    name: string,
    version: string,
    description: string,
    /**
     * Specify the config name if differs from the cli name.
     * e.g. name = `cli`,
     * configName = `my-cli`,
     * will load the first config named as:
     * - `my-cli.json`
     * - `.my-clirc.json`
     * - `.my-clirc`
     * in that order
     */
    configName?: string
  }

  export type Builder<Config = undefined> = {
    readonly name: string,
    readonly version: string,
    readonly description: string,
    config: Config,
    loadConfig<T, C extends z.ZodTypeAny>(this: T, options: {
      name?: string,
      type: C
    }):
      keyof T & 'default' extends never
      ? (HasKey<T, 'loadPlugins'> extends false
        ? Omit<Builder<z.infer<C>> & Executable, 'loadConfig' | 'default' | 'loadPlugins'>
        : Omit<Builder<z.infer<C>> & Executable, 'loadConfig' | 'default'>)
      : (HasKey<T, 'loadPlugins'> extends false
        ? Omit<Builder<z.infer<C>> & Executable, 'loadConfig' | 'loadPlugins'>
        : Omit<Builder<z.infer<C>>, 'loadConfig'>),
    loadPlugins<T>(this: T, keyword?: string): Omit<T, 'loadPlugins'> & Executable,
    default<
      T,
      AName extends string,
      A extends Command.Argument<AName>[],
      OName extends string,
      O extends Command.Options<OName>
    >(this: T, command: Command.DefaultCommand<Config, A, O>): Omit<T, 'default'> & Executable,
    addCommands<
      T,
      AName extends string,
      A extends Command.Argument<AName>[],
      OName extends string,
      O extends Command.Options<OName>
    >(this: T, commands: Command<Config, A, O>[]): T & Executable
  }

  export type Executable = {
    parse<R = any>(argv: string[]): Promise<R>
  }

  export type Command<
    Config extends Record<string, any> = Record<string, any>,
    A extends Command.Argument[] = Command.Argument[],
    O extends Command.Options = Command.Options
    > = {
      name: string
    } & Command.DefaultCommand<Config, A, O>

  export namespace Command {

    export type DefaultCommand<
      Config extends Record<string, any> = Record<string, any>,
      A extends Argument[] = Argument[],
      O extends Options = Options,
      > = {
        description?: string,
        alias?: string[],
        config?: z.ZodType<any>,
        arguments?: A,
        options?: O,
        commands?: Command[],
        run(this: {
          ui: UI,
          config: Config
        }, args: RunArgs<A, O>): Promise<any> | any
      }

    export type Argument<
      Name extends string = string,
      Type extends z.ZodType<any> | z.ZodOptionalType<z.ZodType<any>> = z.ZodType<any>,
      > = { name: Name, description: string, type?: Type }

    export type Options<
      Name extends string = string,
      Type extends z.ZodType<any> | z.ZodOptionalType<z.ZodType<any>> = z.ZodType<any>,
      > = Record<Name, Options.Entry<Type>>

    export namespace Options {
      export type Default = {
        help: boolean | undefined
      }
      export type Entry<
        Type extends z.ZodType<any> | z.ZodOptionalType<z.ZodType<any>> = z.ZodType<any>
        > = {
          description: string,
          type?: Type,
          default?: z.infer<Type>,
          alias?: Alias[]
        }

      export type Alias = string | { alias: string, hidden: boolean }
    }
    export type RunArgs<A extends Argument[], O extends Options> =
      A extends Argument<infer AName>[] ? O extends Options<infer OName>
      ? (
        { [k in AName]: Extract<UnionOfValues<A>, { name: k }>['type'] extends infer AT
          ? AT extends z.ZodType<any> ? z.infer<AT> : string
          : never
        }
        & { [k in OName]: O[k]['type'] extends infer OT
          ? OT extends z.ZodType<any> ? z.infer<OT> : boolean | undefined
          : never }
        & (string extends OName ? Options.Default : Omit<Options.Default, OName>))
      : never : never
  }


  export type DisplayLevel = 'none' | 'info' | 'debug' | 'trace'

  export type UI = {
    displayLevel: DisplayLevel,
    info(...args: any[]): void,
    warn(...args: any[]): void,
    error(...args: any[]): void,
    debug(...args: any[]): void,
    showHelp(): void,
    showVersion(): void,
  }

  export type PluginActivationContext = {
    addCommand<
      Config,
      AName extends string,
      A extends Command.Argument<AName>[],
      OName extends string,
      O extends Command.Options<OName>
    >(command: Command<Config, A, O>): void
  }
}
