import { Command } from '../Command'
import { Cli } from '../Cli'

import { InMemoryDisplay } from './InMemoryDisplay'

export function getDisplay(subject: Cli | Command): InMemoryDisplay {
  return (subject as any).ui.display
}