import { CliCommand } from '../cli-command'
import { Cli2 } from '../cli/types'
import { JSONTypes } from 'type-plus'

export interface ActivationContext {
  addCommand<Config, Context>(command: CliCommand<Config, Context>): void,
}

export namespace PluginCli2 {
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
}
