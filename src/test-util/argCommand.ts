import { CommandSpec } from '../Command'

export const argCommand = {
  name: 'arg',
  arguments: [
    {
      name: 'some-arg',
      description: 'Some Required Arguments',
      required: true
    },
    {
      name: 'opt-arg',
      description: 'Some Optional Arguments'
    }
  ],
  run(args) {
    this.ui.info(...args._)
  }
} as CommandSpec
