import { CliCommand } from '../cli-command'

export const numberOptionCommand = {
  name: 'number-option',
  options: {
    number: {
      value: {
        description: 'number option',
      },
    },
  },
  run(args) {
    return args.value
  },
} as CliCommand
