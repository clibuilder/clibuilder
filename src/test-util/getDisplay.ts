import { CliCommandInstance } from '../cli-command'
import { Cli } from '../Cli/Cli'

import { InMemoryDisplay } from './InMemoryDisplay'

export function getDisplay(subject: Cli | CliCommandInstance<any, any>): InMemoryDisplay {
  return (subject as any).ui.display
}
