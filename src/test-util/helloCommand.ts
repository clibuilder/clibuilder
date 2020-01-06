import { createCommand } from '../cli'

export const helloCommand = createCommand({
  name: 'hello',
  description: 'hello command',
  async run() {
    return 'hello'
  },
})
