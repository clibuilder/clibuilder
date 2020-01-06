import { JSONTypes } from 'type-plus'
import { PluginCli } from './types'
import { Cli } from '../cli/types'

export function createPluginCommand<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  N1 extends string = string,
  N2 extends string = string,
  N3 extends string = string,
  N4 extends string = string,
  O extends Cli.Options<N2, N3, N4> = Cli.Options<N2, N3, N4>
>(command: PluginCli.Command<Config, Context, N1, N2, N3, N4, O>) {
  return command
}
