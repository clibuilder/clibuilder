import { createCommand } from '../cli'

export const echoCommand = createCommand({
  name: 'echo',
  arguments: [{
    name: 'args',
    description: 'any argument(s)',
    multiple: true,
  }],
  description: 'Echoing input arguments',
  async run(_args, argv) {
    this.ui.info(...argv)
  },
})

export const echoCommandHelpMessage = `
Usage: cli echo

  Echoing input arguments

Arguments:
  [args]                 any argument(s)
`
