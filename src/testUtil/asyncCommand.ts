import { CommandSpec } from '../Command'

export const asyncCommand = {
  name: 'async',
  run() {
    return Promise.resolve()
  }
} as CommandSpec
