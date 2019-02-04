import { RecursivePartial } from 'type-plus';
import { buildContext, CliContext } from '../cli';
import { log } from '../log';
import { CliCommand, CliCommandInstance } from './CliCommand';
import { MultipleArgumentNotLastEntry, OptionNameNotUnique } from './errors';

export function createCliCommand<
  Config extends Record<string, any>,
  Context extends Record<string, any>>(
    cmdSpec: CliCommand<Config, Context>,
    parent: {
      config?: Config,
      context: RecursivePartial<CliContext & Context>
    }): CliCommandInstance<Config, CliContext & Context> {
  log.debug('creatingCommand', cmdSpec.name)

  validateCliCommand(cmdSpec)

  const result = {
    config: parent.config,
    context: parent.context,
    parent,
    ...cmdSpec
  }
  if (!result.ui) {
    const c = buildContext(parent.context)
    result.ui = c.presenterFactory.createCommandPresenter(result)
  }

  if (result.commands) {
    result.commands = result.commands.map(c => createCliCommand(c, result))
  }

  return result as any
}

function validateCliCommand(cmd: CliCommand) {
  validateArgument(cmd)
  validateOptions(cmd)
}

function validateArgument(cmd: CliCommand) {
  const args = cmd.arguments
  if (args) {
    const multiIndex = args.findIndex(arg => arg.multiple === true)
    if (multiIndex !== -1 && multiIndex !== args.length - 1) {
      throw new MultipleArgumentNotLastEntry(cmd.name, args[multiIndex].name)
    }
  }
}

function validateOptions(cmd: CliCommand) {
  const options = cmd.options
  if (options) {
    const strOptionNames = options.string ? Object.keys(options.string) : []
    const numOptionNames = options.number ? Object.keys(options.number) : []
    const boolOptionNames = options.boolean ? Object.keys(options.boolean) : []
    const names: string[] = []
    strOptionNames.forEach(n => {
      if (names.indexOf(n) === -1) names.push(n)
      else throw new OptionNameNotUnique(cmd.name, n)
    })
    numOptionNames.forEach(n => {
      if (names.indexOf(n) === -1) names.push(n)
      else throw new OptionNameNotUnique(cmd.name, n)
    })
    boolOptionNames.forEach(n => {
      if (names.indexOf(n) === -1) names.push(n)
      else throw new OptionNameNotUnique(cmd.name, n)
    })
  }
}
