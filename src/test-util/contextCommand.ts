import { createCommand } from '../cli'

export const contextCommand = createCommand({
  name: 'context',
  description: 'command returning itself (which has context merged)',
  context: { foo() { return 'some string' } },
  run() {
    return this
  }
})
