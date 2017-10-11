import { Command } from './Command'
import { PresenterFactory } from './PresenterFactory';

export function createCommand(spec: Command, presenterFactory: PresenterFactory, context: { [index: string]: any }): Command.Instance {
  const result = {
    run: () => { return },
    ...context,
    ...spec
  } as Command.Instance
  result.ui = presenterFactory.createCommandPresenter(result)
  context.parent = result
  if (result.commands) {
    result.commands = result.commands.map(c => createCommand(c, presenterFactory, context))
  }

  return result
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
      matchedCommand = cmd
      if (cmd.commands) {
        const nested = getCommand(args, cmd.commands)
        if (nested)
          matchedCommand = nested
      }
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
