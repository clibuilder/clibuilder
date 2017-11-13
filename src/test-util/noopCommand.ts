import { CliCommand } from '../CliCommand'

// istanbul ignore next
export const noopCommand: CliCommand = {
  name: 'noop',
  run() {
    return
  }
}
