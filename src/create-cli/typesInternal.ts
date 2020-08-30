import { Cli } from './types'

export type CommandInstance = Cli.RunContext<any, any> & {
  parent?: { name: string },
  run: Cli.RunFn<any, any, any, any, any, any>
}
