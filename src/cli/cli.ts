import { buildCli } from './buildCli'
import { createAppContext } from './createAppContext'
import { cli } from './types'

export function cli(config?: cli.Options) {
  return buildCli(createAppContext())(config)
}
