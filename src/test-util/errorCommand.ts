import { createCommand } from '../create-cli'

export const errorCommand = createCommand({
  name: 'error',
  description: 'emit error to ui',
  run() {
    this.ui.error('error...')
  },
})
