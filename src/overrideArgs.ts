import _ = require('lodash')

import { CliArgs } from './interfaces';
import { toArgsWithoutDefaults } from './toArgsWithoutDefaults';


export function overrideArgs(args: CliArgs, config?: any): { [k: string]: any } {
  const bare = toArgsWithoutDefaults(args)
  const result = _.merge({}, args, config, bare)
  delete result._defaults
  return result
}
