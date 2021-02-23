import * as z from 'zod'
import type { cli } from './cli'

export function command<
  Config extends Record<string, any> = Record<string, any>,
  AName extends string = string,
  A extends cli.Command.Argument<AName>[] = cli.Command.Argument<AName>[],
  O extends cli.Command.Options = cli.Command.Options
>(cmd: cli.Command<Config, A, O>) {
  return cmd
}


export function getBaseCommand(description: string) {
  return command({
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
  })
}
