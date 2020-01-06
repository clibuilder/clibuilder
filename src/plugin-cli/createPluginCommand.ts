import { JSONTypes } from 'type-plus'
import { PluginCli } from './types'
import { Cli } from '../cli/types'

export function createPluginCommand<
  Config extends Record<string, JSONTypes> | undefined,
  Context,
  AName extends string = string,
  BName extends string = string,
  SName extends string = string,
  NName extends string = string,
  O extends Cli.Options<BName, SName, NName> = Cli.Options<BName, SName, NName>
>(command: PluginCli.Command<Config, Context, AName, BName, SName, NName, O>) {
  return command
}
