import { createCommand } from '../cli'

export const errorCommand = createCommand({
  name: 'error',
  description: 'emit error to ui',
  run() {
    this.ui.error('error...')
  },
})
