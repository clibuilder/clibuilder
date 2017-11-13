import { CliCommand } from '../CliCommand'

export const asyncCommand = {
  name: 'async',
  run() {
    return Promise.resolve()
  }
} as CliCommand
