import { CliCommand } from '../CliCommand'

export const errorCommand: CliCommand = {
  name: 'error',
  run() {
    this.ui.error('error...')
  }
}
