import { CliCommand } from '../CliCommand/CliCommand'

export const errorCommand: CliCommand = {
  name: 'error',
  run() {
    this.ui.error('error...')
  }
}
