// @ts-ignore noUnusedLocal
import minimist = require('minimist')
import { parseArgv } from '../parseArgv'
import { Parsable } from '../interfaces'

export function createCommandArgs(parsable: Parsable, argv: string[] = []) {
  argv.unshift(parsable.name)
  return parseArgv(parsable, argv)
}
