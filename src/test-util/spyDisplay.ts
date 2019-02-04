import { Cli } from '../Cli/Cli'

import { CompositeDisplay } from './CompositeDisplay'
import { InMemoryDisplay } from './InMemoryDisplay'

export function spyDisplay(cli: Cli, cmdName?: string) {
  const memDisplay = new InMemoryDisplay()

  let ui = cmdName ? (cli.commands.find(c => c.name === cmdName) as any).ui : (cli as any).ui

  ui.display = new CompositeDisplay(ui.display, memDisplay)

  return memDisplay
}
