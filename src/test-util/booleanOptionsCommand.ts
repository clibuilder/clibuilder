import { createCommand } from '../create-cli'

export const booleanOptionsCommand = createCommand({
  name: 'opt',
  description: 'emit opt info to info ui',
  options: {
    boolean: {
      'a': {
        description: 'a',
        default: true,
      },
      'b': {
        description: 'b',
      },
    },
  },
  run(args) {
    this.ui.info(`a: ${args.a}, b: ${args.b}`)
  },
})
