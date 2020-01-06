import { createCommand } from '../cli'

export const groupOptionsCommand = createCommand({
  name: 'opt',
  description: 'emit option info with group to into ui',
  options: {
    boolean: {
      'a': {
        description: 'a',
        default: true,
        group: 'x',
      },
      'b': {
        description: 'b',
        group: 'x',
      },
    },
  },
  run(args) {
    this.ui.info(`a: ${args.a}, b: ${args.b}`)
    return args
  },
})
