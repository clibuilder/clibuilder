
import { UnionOfValues } from 'type-plus'
import z from 'zod'
import { context } from './context'
import { builder } from './builder'

export function cli(options?: cli.Options): cli.Builder<void> {
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
  }

  export type Builder<Config> = {
    readonly name: string,
    readonly version: string,
    readonly description: string,
    loadConfig<T>(this: T): Omit<T, 'loadConfig'> & { config: any }
    loadPlugins<T>(this: T): Omit<T, 'loadPlugins'> & Executable
    default<
      T,
      AName extends string,
      A extends Command.Argument<AName>[],
      OName extends string,
      O extends Command.Options<OName>
    >(this: T, command: Command.DefaultCommand<Config, A, O>): Omit<T, 'default'> & Executable,
    addCommands<T>(this: T, commands: Command[]): T & Executable
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
        alias?: string[]
        config?: z.ZodType<any>,
        arguments?: A,
        options?: O,
        commands?: Command[]
        run(this: {
          ui: UI,
          config: Config
        }, args: RunArgs<A, O>): Promise<any> | any
      }

    export type Argument<
      Name extends string = string,
      Type extends z.ZodType<any> = z.ZodType<any>,
      > = { name: Name, description: string, type?: Type }

    export type Options<
      Name extends string = string,
      Type extends z.ZodType<any> = z.ZodType<any>,
      > = Record<Name, Options.Entry<Type>>

    export namespace Options {
      export type Default = {
        help: boolean,
        silent: boolean,
        verbose: boolean
      }
      export type Entry<
        Type extends z.ZodType<any> = z.ZodType<any>
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
          ? AT extends z.ZodType<any> ? z.infer<AT> : never
          : never
        }
        & { [k in OName]: O[k]['type'] extends infer OT
          ? OT extends z.ZodType<any> ? z.infer<OT> : never
          : never }
        & Options.Default)
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
}
