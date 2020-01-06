import { Cli2 } from './types'

export type CommandInstance = Cli2.RunContext<any, any> & {
  parent?: { name: string },
  run: Cli2.RunFn<any, any, any, any, any, any>
}
