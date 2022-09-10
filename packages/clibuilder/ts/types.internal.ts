import type { cli } from './cli.js'

export type Command = cli.Command & {
  parent?: Command
}
