import { Command } from '../Command'

export const errorCommand: Command = {
  name: 'error',
  run() {
    this.ui.error('error...')
  }
}
