import * as z from 'zod'
import { command } from './command'

export function getBaseCommand(description: string): command.Command {
  return {
    name: '',
    description,
    options: {
      'help': {
        type: z.boolean(),
        description: 'Print help message',
        alias: ['h']
      },
      'version': {
        type: z.boolean(),
        description: 'Print the CLI version',
        alias: ['v']
      },
      'verbose': {
        type: z.boolean(),
        description: 'Turn on verbose logging',
        alias: ['V']
      },
      'silent': {
        type: z.boolean(),
        description: 'Turn off logging',
      },
      'debug-cli': {
        type: z.boolean(),
        description: 'Display clibuilder debug messages',
      },
    },
    run() {
      this.ui.showHelp()
    }
  }
}
