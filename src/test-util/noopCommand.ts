import { createCommand } from '../cli'

export const noopCommand = createCommand({
  name: 'noop',
  description: 'noop command',
  run() { return },
})
