export const defaultCommandOptions = {
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
  },
}
