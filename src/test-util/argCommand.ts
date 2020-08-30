import { createCommand } from '../create-cli'

export const argCommand = createCommand({
  name: 'arg',
  description: '',
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
})
