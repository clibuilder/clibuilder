import { JSONTypes } from 'type-plus'
import { Cli } from '../cli/types'

export namespace PluginCli {
  export type ActivationContext = {
    addCommand<
      Config extends Record<string, JSONTypes> | undefined,
      Context,
      N1 extends string = string,
      N2 extends string = string,
      N3 extends string = string,
      N4 extends string = string,
      >(
        command: Cli.Command<Config, Context, N1, N2, N3, N4>
      ): void,
  }

  export type ConstructOptions<
    Config extends Record<string, JSONTypes> | undefined,
    Context,
    N1 extends string,
    N2 extends string,
    N3 extends string,
    N4 extends string,
    O extends Cli.Options<N2, N3, N4> = Cli.Options<N2, N3, N4>
    > = Cli.ConstructOptionsBase<Config, Context> & {
      keyword?: string,
      description?: string,
      arguments?: Cli.Argument<N1>[],
      options?: O,
      commands?: Command<Config, Context>[],
      run?: Cli.RunFn<Config, Context, N1, N2, N3, N4, O>
    }

  export type Command<
    Config extends Record<string, JSONTypes> | undefined = undefined,
    Context extends Partial<Cli.BuildInContext> & Record<string | symbol, any> = Partial<Cli.BuildInContext>,
    N1 extends string = string,
    N2 extends string = string,
    N3 extends string = string,
    N4 extends string = string,
    O extends Cli.Options<N2, N3, N4> = Cli.Options<N2, N3, N4>
    > = {
      name: string,
      description: string,
      arguments?: Cli.Argument<N1>[],
      options?: O,
      alias?: string[],
      commands?: Command<Config, Context>[],
      run?(this: Cli.RunContext<Config, Context & { keyword: string }>, args: Cli.RunArgs<N1, N2, N3, N4, O>, argv: string[]): Promise<any> | any,
    }
}
