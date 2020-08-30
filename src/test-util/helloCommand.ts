import { createCommand } from '../create-cli'

export const helloCommand = createCommand({
  name: 'hello',
  description: 'hello command',
  async run() {
    return 'hello'
  },
})
