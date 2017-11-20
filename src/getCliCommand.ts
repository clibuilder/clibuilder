import { CliCommandInstance } from './CliCommand'

export function getCliCommand<Config, Context>(args: string[], commands: CliCommandInstance[]): CliCommandInstance<Config, Context> | undefined {
  if (args.length === 0)
    return undefined
  const nameOrAlias = args.shift()!
  let matchedCommand
  commands.forEach(cmd => {
    const match = cmd.name === nameOrAlias ||
      (!!cmd.alias && cmd.alias.indexOf(nameOrAlias) !== -1)
    if (!match) return
    matchedCommand = cmd
    if (!cmd.commands) return

    const nested = getCliCommand(args, cmd.commands)
    if (nested)
      matchedCommand = nested
  })
  return matchedCommand
}
