import { cli } from './types'

export const clibuilderCommand: cli.Command = {
  name: '',
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
    this.ui.showHelp()
  }
}
