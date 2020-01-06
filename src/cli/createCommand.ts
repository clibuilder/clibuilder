import { JSONTypes } from 'type-plus'
import { Cli2 } from './types'

export function createCommand<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  N1 extends string = string,
  N2 extends string = string,
  N3 extends string = string,
  N4 extends string = string,
  O extends Cli2.Options<N2, N3, N4> = Cli2.Options<N2, N3, N4>

>(command: Cli2.Command<Config, Context, N1, N2, N3, N4, O>) {
  return command
}
