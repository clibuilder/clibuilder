import { CommandSpec } from '../index'

export const noopCommandSpec: CommandSpec = {
  name: 'noop',
  run() {
    return
  }
}

export const echoCommandSpec: CommandSpec = {
  name: 'echo',
  arguments: [{
    name: 'args',
    description: 'any argument(s)',
    multiple: true
  }],
  description: 'Echoing input arguments',
  run(_args, argv) {
    this.ui.info(...argv)
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

export const echoNameOptionCommandSpec = {
  name: 'echoNameOption',
  alias: ['eno'],
  description: 'Echo the input "name" option',
  options: {
    string: {
      name: {
        default: 'abc',
        description: 'Name option to be echoed'
      }
    }
  },
  run(args) {
    this.ui.info(args.name)
  }
} as CommandSpec

export const asyncCommandSpec = {
  name: 'async',
  description: 'async command',
  async run() {
    await new Promise(r => {
      setImmediate(r)
    })
  }
} as CommandSpec

export const argCommandSpec = {
  name: 'arg',
  arguments: [
    {
      name: 'some-arg',
      description: 'Some Required Arguments',
      required: true
    },
    {
      name: 'opt-arg',
      description: 'Some Optional Arguments'
    }
  ]
} as CommandSpec
