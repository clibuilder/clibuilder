import _ from 'lodash'
import { CliArgs } from './types'
import { toArgsWithoutDefaults } from './toArgsWithoutDefaults'

export function overrideArgs(args: CliArgs, config?: any): { [k: string]: any } {
  const bare = toArgsWithoutDefaults(args)
  const result = _.merge({}, args, config, bare)
  delete result._defaults
  return result
}
