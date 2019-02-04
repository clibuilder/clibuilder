import { CliCommand } from '../CliCommand/CliCommand'

export const groupOptionsCommand = {
  name: 'opt',
  options: {
    boolean: {
      'a': {
        description: 'a',
        default: true,
        group: 'x'
      },
      'b': {
        description: 'b',
        group: 'x'
      }
    }
  },
  run(args) {
    this.ui.info(`a: ${args.a}, b: ${args.b}`)
  }
} as CliCommand
