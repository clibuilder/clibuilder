import _ = require('lodash')

import { Command } from './Command'

export function createCommand(spec: Command, { cwd, parent, presenterFactory }): Command.Instance {
  const result = _.merge<Command.Instance>({
    run: () => { return },
    cwd,
    parent
  }, spec)
  result.ui = presenterFactory.createCommandPresenter(result)

  if (result.commands) {
    result.commands = result.commands.map(c => createCommand(c, { cwd, parent: result, presenterFactory}))
  }

  return result as any
}

export function getCommand(args: string[], commands: Command.Instance[]): Command.Instance | undefined {
  if (args.length === 0)
    return undefined
  const nameOrAlias = args.shift()!

  let matchedCommand
  commands.forEach(cmd => {
    const match = cmd.name === nameOrAlias ||
      (!!cmd.alias && cmd.alias.indexOf(nameOrAlias) !== -1)
    if (match) {
      matchedCommand = cmd.commands ? getCommand(args, cmd.commands) : cmd
    }
  })
  return matchedCommand
}

export function getCommandAndAliasNames(commands: { name: string, alias?: string[] }[]) {
  const names: string[] = []
  commands.forEach(cmd => {
    names.push(cmd.name)
    if (cmd.alias) {
      names.push(...cmd.alias)
    }
  })
  return names.sort()
}
