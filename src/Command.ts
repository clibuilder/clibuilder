import { Command } from './interfaces'

export function getCommand(nameOrAlias, commands: Command[]) {
  return commands.find(cmd => {
    return cmd.name === nameOrAlias ||
      (!!cmd.alias && cmd.alias.indexOf(nameOrAlias) !== -1)
  })
}

export function getCommandAndAliasNames(commands: Command[]) {
  const names: string[] = []
  commands.forEach(cmd => {
    names.push(cmd.name)
    if (cmd.alias) {
      names.push(...cmd.alias)
    }
  })
  return names.sort()
}
