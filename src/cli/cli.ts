import { buildCli } from './buildCli'
import { createAppContext } from './createAppContext'
import { cli } from './types'

export function cli(options?: cli.Options) {
  return buildCli(createAppContext())(options)
}
