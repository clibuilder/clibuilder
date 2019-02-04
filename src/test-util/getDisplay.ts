import { CliCommandInstance } from '../cli-command'
import { Cli } from '../cli'

import { InMemoryDisplay } from './InMemoryDisplay'

export function getDisplay(subject: Cli<any, any> | CliCommandInstance<any, any>): InMemoryDisplay {
  return (subject as any).ui.display
}
