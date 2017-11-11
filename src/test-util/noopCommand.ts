import { Command } from '../Command'

// istanbul ignore next
export const noopCommand: Command = {
  name: 'noop',
  run() {
    return
  }
}
