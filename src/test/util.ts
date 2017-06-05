export function createArgv(...args) {
  args.unshift('node', 'cli')
  return args
}
