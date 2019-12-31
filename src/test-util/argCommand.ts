import { CliCommand } from '../cli-command'

export const argCommand = {
  name: 'arg',
  arguments: [
    {
      name: 'required-arg',
      description: 'Some Required Arguments',
      required: true,
    },
    {
      name: 'optional-arg',
      description: 'Some Optional Arguments',
    },
  ],
  async run(args) {
    return args
  },
} as CliCommand
