import { CliCommand } from '../CliCommand'

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
    this.ui.info(`some-arg: ${args['some-arg']}`, `opt-arg: ${args['opt-arg']}`)
  }
} as CliCommand
