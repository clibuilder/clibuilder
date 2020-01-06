import { createCommand } from '../cli'

// istanbul ignore next
export const noopCommand = createCommand({
  name: 'noop',
  description: 'noop command',
  run() { return },
})
