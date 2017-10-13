export function createCliArgv(cliName: string, ...args) {
  args.unshift('node', cliName)
  return args
}
