import { createCommand } from '../create-cli'

export const contextCommand = createCommand({
  name: 'context',
  description: 'command returning itself (which has context merged)',
  context: {
    // istanbul ignore next
    foo() { return 'some string' }
  },
  run() {
    return this
  }
})
