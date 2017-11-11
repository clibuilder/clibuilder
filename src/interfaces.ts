import { Command } from './Command'

export interface Parsable {
  name: string
  arguments?: Command.Argument[]
  commands?: Parsable[]
  options?: {
    boolean?: Command.BooleanOptions
    string?: Command.StringOptions,
    number?: Command.NumberOptions
  }
}
