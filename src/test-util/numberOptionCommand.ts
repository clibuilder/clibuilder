import { createCommand } from '../create-cli'

export const numberOptionCommand = createCommand({
  name: 'number-option',
  description: 'number option',
  options: {
    number: {
      value: {
        description: 'number option',
      },
    },
  },
  run(args) {
    return args
  },
})
