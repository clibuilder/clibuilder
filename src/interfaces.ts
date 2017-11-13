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
