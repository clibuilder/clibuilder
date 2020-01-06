import { Cli2 } from '../cli/types'
import { JSONTypes } from 'type-plus'


export namespace PluginCli2 {
  export type ActivationContext = {
    addCommand<
      Config extends Record<string, JSONTypes> | undefined,
      Context,
      N1 extends string = string,
      N2 extends string = string,
      N3 extends string = string,
      N4 extends string = string,
      >(
        command: Cli2.Command<Config, Context, N1, N2, N3, N4>
      ): void,
  }

  export type ConstructOptions<
    Config extends Record<string, JSONTypes> | undefined,
    Context,
    N1 extends string,
    N2 extends string,
    N3 extends string,
    N4 extends string,
    O extends Cli2.Options<N2, N3, N4> = Cli2.Options<N2, N3, N4>
    > = Cli2.ConstructOptionsBase<Config, Context> & {
      keyword?: string,
      description?: string,
      arguments?: Cli2.Argument<N1>[],
      options?: O,
      commands?: Cli2.Command<Config, Context>[],
      run?: Cli2.RunFn<Config, Context, N1, N2, N3, N4, O>
    }

  export type Command<
    Config extends Record<string, JSONTypes> | undefined = undefined,
    Context extends Partial<Cli2.BuildInContext> & Record<string | symbol, any> = Partial<Cli2.BuildInContext> & { keyword: string },
    N1 extends string = string,
    N2 extends string = string,
    N3 extends string = string,
    N4 extends string = string,
    > = Cli2.Command<Config, Context, N1, N2, N3, N4>
}
