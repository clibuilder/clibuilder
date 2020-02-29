import { createCommand } from '../cli'

export const argvCommand = createCommand({
  name: 'argv',
  description: 'returning argv',
  arguments: [{ name: 'any-args', multiple: true }],
  async run(_, argv) {
    return argv
  },
})
