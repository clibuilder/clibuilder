import { Cli } from '../cli/types'

export interface Parsable {
  name: string,
  arguments?: Cli.Argument[],
  commands?: Parsable[],
  options?: Cli.Options,
}

export interface CliArgsWithoutDefaults {
  _: string[],
  [name: string]: any,
}
export interface CliArgs extends CliArgsWithoutDefaults {
  _defaults: string[],
}
