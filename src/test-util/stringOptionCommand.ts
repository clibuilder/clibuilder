import { Command } from '../Command'

export const stringOptionCommand = {
  name: 'opt',
  options: {
    string: {
      'a': {
        description: 'string option a'
      }
    }
  },
  run(args) {
    this.ui.info(`a: ${args.a}`)
  }
} as Command
