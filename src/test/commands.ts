import { CommandSpec } from '../Command'

export const noopCommandSpec: CommandSpec = {
  name: 'noop',
  run() {
    return
  }
}

export const echoCommandSpec: CommandSpec = {
  name: 'echo',
  run(args) {
    this.ui.info(...args)
  }
}

export const verboseCommandSpec: CommandSpec = {
  name: 'verbose',
  alias: ['vb', 'detail'],
  options: {
    boolean: {
      verbose: {
        description: 'print verbose messages'
      }
    }
  },
  run() {
    this.ui.debug('print verbosely')
  }
}

export const errorCommandSpec: CommandSpec = {
  name: 'error',
  run() {
    this.ui.error('error...')
  }
}
