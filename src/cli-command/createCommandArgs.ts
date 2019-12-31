import { parseArgv } from '../argv-parser'
import { Parsable } from '../argv-parser/types'

export function createCommandArgs(parsable: Parsable, argv: string[] = []) {
  argv.unshift(parsable.name)
  return parseArgv(parsable, argv)
}
