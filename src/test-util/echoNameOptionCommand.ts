import { CliCommand } from '../cli-command'

export const echoNameOptionCommand = {
  name: 'echoNameOption',
  alias: ['eno'],
  description: 'Echo the input "name" option',
  options: {
    string: {
      name: {
        default: 'abc',
        description: 'Name option to be echoed'
      }
    }
  },
  run(args) {
    this.ui.info(args.name)
  }
} as CliCommand
