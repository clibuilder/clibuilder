import { Parsable, parseArgv } from '../argv-parser';

export function createCommandArgs(parsable: Parsable, argv: string[] = []) {
  argv.unshift(parsable.name)
  return parseArgv(parsable, argv)
}
