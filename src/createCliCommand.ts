import { CliCommand, CliCommandInstance } from './CliCommand'
import { PresenterFactory } from './interfaces'
import { log } from './log'

export function createCliCommand<Config, Context = {}>(spec: CliCommand<Config, Context>, presenterFactory: PresenterFactory, context: {
  config?: Config,
  [index: string]: any
}): CliCommandInstance<Config, Context> {
  if (spec) log.debug('creatingCommand', spec.name)
  const result = {
    ...context,
    ...spec
  } as CliCommandInstance<Config, Context>
  result.ui = result.ui || presenterFactory.createCommandPresenter(result)
  if (result.commands) {
    result.commands = result.commands.map(c => createCliCommand(c, presenterFactory, { ...context, parent: result }))
  }

  return result
}
