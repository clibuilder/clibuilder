import { createCommand } from '../create-cli'

export const echoDebugCommand = createCommand({
  name: 'echo-debug',
  description: 'Echoing input arguments to debug ui',
  arguments: [{
    name: 'args',
    description: 'any argument(s)',
    multiple: true,
  }],
  run(_args, argv) {
    this.ui.debug(...argv)
  }
})
