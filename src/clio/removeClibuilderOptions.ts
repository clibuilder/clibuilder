import { reduceByKey } from 'type-plus'
import { Cli } from '../create-cli'

export function removeClibuilderOptions(args: Cli.RunArgs, argv: string[]): [Cli.RunArgs<any, any, any, any>, string[]] {
  const keys = ['version', 'verbose', 'silent', 'debug-cli']
  const keys2 = ['--version', '--verbose', '--silent', '--debug-cli', '-V', '-v']
  return [reduceByKey(args, (p, v) => {
    if (keys.indexOf(v) === -1) p[v] = args[v]
    return p
  }, {} as any), argv.filter(a => keys2.indexOf(a) === -1)]
}
