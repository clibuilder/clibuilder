import { CliCommand } from '../cli-command'

// istanbul ignore next
export const noopCommand: CliCommand = {
  name: 'noop',
  run() {
    return
  }
}
