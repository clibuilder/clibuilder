import { Command } from '../Command'

export const noopCommand: Command = {
  name: 'noop',
  run() {
    return
  }
}
