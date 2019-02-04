import { CliCommand } from '../CliCommand/CliCommand'

export const asyncCommand = {
  name: 'async',
  run() {
    return Promise.resolve()
  }
} as CliCommand
