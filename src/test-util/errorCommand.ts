import { CommandSpec } from '../Command'

export const errorCommand: CommandSpec = {
  name: 'error',
  run() {
    this.ui.error('error...')
  }
}
