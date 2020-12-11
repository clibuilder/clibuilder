import { clibuilder } from './clibuilder'
import { createAppContext } from './createAppContext'
import { cli } from './types'

export function cli(options?: cli.Options) {
  return clibuilder(createAppContext(), options)
}
