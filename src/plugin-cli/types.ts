import { JSONTypes } from 'type-plus'
import { Cli } from '../cli/types'

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
        command: Cli.Command<Config, Context, AName, BName, SName, NName>
      ): void,
  }

  export type ConstructOptions<
    Config extends Record<string, JSONTypes> | undefined,
    Context,
    AName extends string,
    BName extends string,
    SName extends string,
    NName extends string,
    O extends Cli.Options<BName, SName, NName> = Cli.Options<BName, SName, NName>
    > = Cli.ConstructOptionsBase<Config, Context> & {
      keyword?: string,
      description?: string,
      arguments?: Cli.Argument<AName>[],
      options?: O,
      commands?: Command<Config, Context>[],
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
      description: string,
      arguments?: Cli.Argument<AName>[],
      options?: O,
      alias?: string[],
      commands?: Command<Config, Context>[],
      run?(this: Cli.RunContext<Config, Context & { keyword: string }>, args: Cli.RunArgs<AName, BName, SName, NName, O>, argv: string[]): Promise<any> | any,
    }
}
