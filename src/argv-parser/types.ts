import { Cli2 } from '../cli/types'

export interface Parsable {
  name: string,
  arguments?: Cli2.Argument[],
  commands?: Parsable[],
  options?: Cli2.Options,
}

export interface CliArgsWithoutDefaults {
  _: string[],
  [name: string]: any,
}
export interface CliArgs extends CliArgsWithoutDefaults {
  _defaults: string[],
}
