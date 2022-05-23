import type { cli } from './cli'

export type Command = cli.Command & {
  parent?: Command
}
