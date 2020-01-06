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
      commands?: Cli.Command<Config, Context>[],
      run?: Cli.RunFn<Config, Context, N1, N2, N3, N4, O>
    }

  export type Command<
    Config extends Record<string, JSONTypes> | undefined = undefined,
    Context extends Partial<Cli.BuildInContext> & Record<string | symbol, any> = Partial<Cli.BuildInContext> & { keyword: string },
    N1 extends string = string,
    N2 extends string = string,
    N3 extends string = string,
    N4 extends string = string,
    > = Cli.Command<Config, Context, N1, N2, N3, N4>
}
