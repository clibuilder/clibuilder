import { Command } from '../Command'

export const numberOptionCommand = {
  name: 'num-opt',
  options: {
    number: {
      'a': {
        description: 'number option a'
      }
    }
  },
  run(args) {
    this.ui.info(`a: ${args.a}`)
  }
} as Command
