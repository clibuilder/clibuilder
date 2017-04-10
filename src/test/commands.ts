import { Command, createLogger } from '../index'

export const simpleCommand = {
  name: 'simple',
  log: createLogger('SimpleCommand'),
  run(_argv: string[]) {
    return
  }
} as Command

export const noopCommand = {
  name: 'noop',
  run() { return }
} as Command
