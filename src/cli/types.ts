import { JSONTypes, KeyofOptional } from 'type-plus'
import { HelpPresenter, LogPresenter, PromptPresenter, VersionPresenter } from '../presenter/types'

export type Cli = {
  name: string,
  version: string,
  /**
   * parse process.argv
   */
  parse(argv: string[]): Promise<any>,
}

export namespace Cli {
  export type ConstructOptions<
    Config extends Record<string, JSONTypes> | undefined,
    Context,
    AName extends string,
    BName extends string,
    SName extends string,
    NName extends string,
    O extends Options<BName, SName, NName> = Options<BName, SName, NName>
    > = ConstructOptionsBase<Config, Context> & ({
      name: string,
      description: string,
      arguments?: Argument<AName>[],
      options?: O,
      commands?: Command<Config, Context>[],
      run: RunFn<Config, Context, AName, BName, SName, NName, O>
    } | {
      commands: Command<Config, Context>[],
    })

  export type ConstructOptionsBase<
    Config extends Record<string, JSONTypes> | undefined,
    Context,
    > = {
      name: string,
      version: string,
      /**
       * The default config for the cli.
       * The config will be available to the cli and its command at `this.config`.
       * If specified, the configuration will be loaded from `<cli-name>.json` (or `<configName>.json` if specified).
       */
      config?: Config,
      /**
       * Specify the config name if differs from the cli name.
       * e.g. name = `cli`,
       * configName = `my-cli`,
       * will load config from `my-cli.json`
       */
      configName?: string,
      /**
       * A context that the cli and its commands will have access to (at `this`).
       */
      context?: Context,
    }

  export type RunFn<
    Config,
    Context,
    AName extends string,
    BName extends string,
    SName extends string,
    NName extends string,
    O extends Options<BName, SName, NName> = Options<BName, SName, NName>
    > = (this: RunContext<Config, Context>, args: RunArgs<AName, BName, SName, NName, O>, argv: string[]) => Promise<any> | any

  export type Command<
    Config extends Record<string, JSONTypes> | undefined = undefined,
    Context extends Partial<BuildInContext> & Record<string | symbol, any> = Partial<BuildInContext>,
    AName extends string = string,
    BName extends string = string,
    SName extends string = string,
    NName extends string = string,
    O extends Options<BName, SName, NName> = Options<BName, SName, NName>
    > = {
      name: string,
    } & ({
      description: string,
      /**
       * The config this command is expecting.
       * The value in this property is not actively used.
       * It is used to define the shape of the config.
       * Defining this property has the same effect as specifying the generic type `Config`,
       * but still keep the type inference working.
       */
      config?: Config,
      /**
       * A context that the the command will receive at `this`.
       * Use this for dependency injection,
       * and specifying the shape of the context,
       * like the `config` property.
       */
      context?: Context,
      arguments?: Argument<AName>[],
      options?: O,
      alias?: string[],
      commands?: Command<Config, Context>[],
      run(this: RunContext<Config, Context>, args: RunArgs<AName, BName, SName, NName, O>, argv: string[]): Promise<any> | any,
    } | {
      commands: Command<Config, Context>[],
    })

  export type RunContext<Config, Context> = {
    name: string,
    version: string,
    ui: LogPresenter & HelpPresenter & VersionPresenter & PromptPresenter,
    config: Config,
    cwd: string
  } & Omit<Context, 'ui' | 'cwd'>

  export type RunArgs<
    AName extends string = string,
    BName extends string = string,
    SName extends string = string,
    NName extends string = string,
    O extends Options<BName, SName, NName> = Options<BName, SName, NName>
    > =
    DefaultArgs & ArgumentNamesRecord<Argument<AName>> &
    Record<KeyofOptional<O['boolean']>, boolean> &
    Record<KeyofOptional<O['string']>, string> &
    Record<KeyofOptional<O['number']>, number>

  export type DefaultArgs = {
    help: boolean
  }

  export type Argument<Name extends string = string> = {
    name: Name,
    description?: string,
    required?: boolean,
    multiple?: boolean,
  }

  export type ArgumentNamesRecord<A extends Argument<string>> = { [K in A['name']]: string }

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

  export type BuildInContext = {
    ui: LogPresenter & HelpPresenter & VersionPresenter & PromptPresenter,
    cwd: string
  }
}
