import { CliCommand } from './CliCommand'

export interface Parsable {
  name: string
  arguments?: CliCommand.Argument[]
  commands?: Parsable[]
  options?: {
    boolean?: CliCommand.BooleanOptions
    string?: CliCommand.StringOptions,
    number?: CliCommand.NumberOptions
  }
}

export interface CliArgsWithouDefaults {
  _: string[],
  [name: string]: any
}
export interface CliArgs extends CliArgsWithouDefaults {
  _defaults: string[]
}
