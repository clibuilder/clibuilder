import { CommandSpec } from '../Command'

export const noopCommand: CommandSpec = {
  name: 'noop',
  run() {
    return
  }
}
