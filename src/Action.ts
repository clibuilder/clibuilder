import { CommandBuilder } from './CommandBuilder'
import { UI } from './CliBuilder'

export interface Action<A, O> {
  (args: A, options: O, builder: CommandBuilder, ui: UI): boolean | void
}
