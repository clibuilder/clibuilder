// @ts-ignore noUnusedLocal
import minimist = require('minimist')
import { Parsable } from '../interfaces';
import { parseArgv } from '../parseArgv';

export function createCommandArgs(parsable: Parsable, argv: string[] = []) {
  argv.unshift(parsable.name)
  return parseArgv(parsable, argv)
}
