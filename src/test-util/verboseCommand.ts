import { createCommand } from '../create-cli'

export const verboseCommand = createCommand({
  name: 'verbose',
  description: 'verbose command',
  alias: ['vb', 'detail'],
  options: {
    boolean: {
      verbose: {
        description: 'print verbose messages',
      },
    },
  },
  run() {
    this.ui.debug('print verbosely')
  },
})
