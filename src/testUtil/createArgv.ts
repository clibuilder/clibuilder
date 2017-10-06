export function createArgv(cliName: string, ...args) {
  args.unshift('node', cliName)
  return args
}
