import { argv } from '../test-utils'
import type { command } from './command'
import { getBaseCommand } from '../getBaseCommand'
import { mockAppContext } from './mockAppContext'
import { processArgv2 } from './processArgv'

const baseCommand = getBaseCommand('some description')

describe('with default command', () => {
  test.skip('multiple arguments', () => {
    const defaultCommand: command.Command = {
      name: '',
      arguments: [{ name: 'arg', description: 'arg' }],
      run() { }
    }
    const ctx = mockAppContext('single-bin/bin.js')
    const { command, args } = processArgv2(ctx,
      [defaultCommand, baseCommand],
      argv('my-cli abc def'))
    expect(command).toBe(defaultCommand)
    expect(args).toEqual({ _: ['abc'] })
  })
})
