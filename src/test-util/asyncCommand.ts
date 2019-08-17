import { CliCommand } from '../cli-command';

export const asyncCommand = {
  name: 'async',
  run() {
    return Promise.resolve()
  },
} as CliCommand
