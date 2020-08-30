import { createCommand } from '../create-cli'

export const echoNameOptionCommand = createCommand({
  name: 'echoNameOption',
  alias: ['eno'],
  description: 'Echo the input "name" option',
  options: {
    string: {
      name: {
        default: 'abc',
        description: 'Name option to be echoed',
      },
    },
  },
  run(args) {
    this.ui.info(args.name)
  },
})
