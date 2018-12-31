export function createCliArgv(cliName: string, ...args: string[]) {
  args.unshift('node', cliName)
  return args
}
