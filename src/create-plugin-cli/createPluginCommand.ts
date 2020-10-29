import { JSONTypes } from 'type-plus'
import { PluginCli } from './types'
import { Cli } from '../create-cli/types'

export { JSONTypes }

export function createPluginCommand<
  Config extends Record<string, JSONTypes> | undefined,
  Context extends Record<string | symbol, any> = Record<string | symbol, any>,
  AName extends string = string,
  BName extends string = string,
  SName extends string = string,
  NName extends string = string,
  O extends Cli.Options<BName, SName, NName> = Cli.Options<BName, SName, NName>
>(command: PluginCli.Command<Config, Context, AName, BName, SName, NName, O>):
  PluginCli.Command {
  return command as any
}
