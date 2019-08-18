import { CliCommand } from '../cli-command'

export const helloCommand: CliCommand = {
  name: 'hello',
  async run() {
    return 'hello'
  },
}
