import { CliCommand } from '../CliCommand';

export const voidCommand: CliCommand = {
  name: 'void',
  run() { return }
}

export const promiseVoidCommand: CliCommand = {
  name: 'promise-void',
  run(args) { return Promise.resolve() }
}

export const promiseBooleanCommand: CliCommand = {
  name: 'promise-bool',
  run(args, argv) { return Promise.resolve(true) }
}

