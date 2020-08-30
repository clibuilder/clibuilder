import { createCommand } from '../create-cli'

export const stringOptionCommand = createCommand({
  name: 'opt',
  description: 'string option command',
  options: {
    string: {
      a: {
        description: 'string option a',
      },
    },
  },
  run(args) {
    this.ui.info(`a: ${args.a}`)
    return args
  },
})
