import { JSONTypes } from 'type-plus'
import { Cli } from './types'

export function createCommand<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  N1 extends string = string,
  N2 extends string = string,
  N3 extends string = string,
  N4 extends string = string,
  O extends Cli.Options<N2, N3, N4> = Cli.Options<N2, N3, N4>
>(command: Cli.Command<Config, Context, N1, N2, N3, N4, O>) { return command }
