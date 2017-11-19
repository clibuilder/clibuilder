import { CliCommand, CliCommandInstance } from './CliCommand'
import { PresenterFactory } from './PresenterFactory'
import { log } from './log'

export function createCommand<Config, Context = {}>(spec: CliCommand<Config, Context>, presenterFactory: PresenterFactory, context: {
  config?: Config,
  [index: string]: any
}): CliCommandInstance<Config, Context> {
  if (spec)
    log.debug('creatingCommand', spec.name)
  const result = {
    run: () => { return undefined },
    ...context,
    ...spec
  } as CliCommandInstance<Config, Context>
  result.ui = presenterFactory.createCommandPresenter(result)
  if (result.commands) {
    result.commands = result.commands.map(c => createCommand(c, presenterFactory, { ...context, parent: result }))
  }

  return result
}

export function getCommand<Config, Context>(args: string[], commands: CliCommandInstance[]): CliCommandInstance<Config, Context> | undefined {
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

    const nested = getCommand(args, cmd.commands)
    if (nested)
      matchedCommand = nested
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
