import { JSONTypes } from 'type-plus'
import { Cli } from './types'

export function createCommand<
  Config extends Record<string, JSONTypes> | undefined,
  Context extends Record<string | symbol, any> = Record<string | symbol, any>,
  AName extends string = string,
  BName extends string = string,
  SName extends string = string,
  NName extends string = string,
  O extends Cli.Options<BName, SName, NName> = Cli.Options<BName, SName, NName>
>(command: Cli.Command<Config, Context, AName, BName, SName, NName, O>) {
  return command as Cli.Command<any, any, AName, BName, SName, NName, O>
}
