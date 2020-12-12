import { cli } from './types'

export function getBottomCommand({ name, description }: Pick<cli.Builder<any>, 'name' | 'description'>) {
  return {
    name,
    description,
    options: {
      boolean: {
        'help': {
          description: 'Print help message',
          alias: ['h'],
        },
        'version': {
          description: 'Print the CLI version',
          alias: ['v'],
        },
        'verbose': {
          description: 'Turn on verbose logging',
          alias: ['V'],
        },
        'silent': {
          description: 'Turn off logging',
        },
        'debug-cli': {
          description: 'Display clibuilder debug messages',
        },
      }
    },
    async run(args) {
      if (args.version) {
        this.ui.showVersion()
        return
      }
      if (args.help) {
        this.ui.showHelp()
        return
      }
      this.ui.showHelp()
    }
  } as cli.Command
}
