import { CliCommand } from '../cli-command'

export const errorCommand: CliCommand = {
  name: 'error',
  run() {
    this.ui.error('error...')
  },
}
