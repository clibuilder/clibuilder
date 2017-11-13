import { CliCommandInstance } from '../CliCommand'
import { Cli } from '../Cli'

import { InMemoryDisplay } from './InMemoryDisplay'

export function getDisplay(subject: Cli | CliCommandInstance): InMemoryDisplay {
  return (subject as any).ui.display
}
