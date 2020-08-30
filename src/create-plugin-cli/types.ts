import { JSONTypes } from 'type-plus'
import { Cli } from '../create-cli/types'

export namespace PluginCli {
  export type ActivationContext = {
    addCommand<
      Config extends Record<string, JSONTypes> | undefined,
      Context,
      AName extends string = string,
      BName extends string = string,
      SName extends string = string,
      NName extends string = string,
      >(
        command: PluginCli.Command<Config, Context, AName, BName, SName, NName>
      ): void,
  }

  export type ConstructOptions<
    Config extends Record<string, JSONTypes> | undefined,
    Context,
    AName extends string,
    BName extends string,
    SName extends string,
    NName extends string,
    CConfig extends Config,
    CContext extends Context,
    O extends Cli.Options<BName, SName, NName> = Cli.Options<BName, SName, NName>,
    > = Cli.ConstructOptionsBase<Config, Context> & {
      keyword?: string,
      description?: string,
      arguments?: Cli.Argument<AName>[],
      options?: O,
      commands?: Command<CConfig, CContext>[],
      run?: Cli.RunFn<Config, Context, AName, BName, SName, NName, O>
    }

  export type Command<
    Config extends Record<string, JSONTypes> | undefined = undefined,
    Context extends Partial<Cli.BuildInContext> & Record<string | symbol, any> = Partial<Cli.BuildInContext>,
    AName extends string = string,
    BName extends string = string,
    SName extends string = string,
    NName extends string = string,
    O extends Cli.Options<BName, SName, NName> = Cli.Options<BName, SName, NName>
    > = {
      name: string,
      commands?: Command<Config, Context>[],
    } | {
      name: string,
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
      arguments?: Cli.Argument<AName>[],
      options?: O,
      alias?: string[],
      commands?: Command<Config, Context>[],
      run(this: Cli.RunContext<Config, Context & { keyword: string }>, args: Cli.RunArgs<AName, BName, SName, NName, O>, argv: string[]): Promise<any> | any,
    }
}
