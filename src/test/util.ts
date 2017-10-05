import { Cli } from '../Cli'

import { CompositeDisplay } from './CompositeDisplay'
import { InMemoryPresenter, InMemoryDisplay } from './InMemoryDisplay'

export function createArgv(...args) {
  args.unshift('node', 'cli')
  return args
}

export function createFakeCli(...commandSpecs): Cli<any> {
  const presenterFactory = {
    createCliPresenter(options) { return new InMemoryPresenter(options) },
    createCommandPresenter(options) { return new InMemoryPresenter(options) }
  }
  return new Cli('cmd', '0.0.0', commandSpecs, { presenterFactory })
}

export function spyDisplay(cli, cmdName?: string) {
  const memDisplay = new InMemoryDisplay()
  if (cmdName) {
    const cmd = cli.commands.find(c => c.name === cmdName)
    cmd.ui.display = new CompositeDisplay(cmd.ui.display, memDisplay)
  }
  else {
    cli.ui.display = new CompositeDisplay(cli.ui.display, memDisplay)
  }

  return memDisplay
}
