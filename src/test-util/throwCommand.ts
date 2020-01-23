import { createCommand } from '../cli'

export const throwCommand = createCommand({
  name: 'throw',
  description: 'emit error to ui',
  arguments: [{
    name: 'message'
  }],
  run({ message }) {
    throw new Error(message)
  },
})

export const rejectCommand = createCommand({
  name: 'reject',
  description: 'emit error to ui',
  arguments: [{
    name: 'message'
  }],
  async run({ message }) {
    throw new Error(message)
  },
})
