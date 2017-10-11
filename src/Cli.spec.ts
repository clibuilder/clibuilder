import test from 'ava'
import Order from 'assert-order'

import { Cli } from './Cli'
import { createArgv } from './test-util/index';

test('Cli context shape should follow input literal', t => {
  const cli = new Cli({
    name: '',
    version: '',
    commands: []
  }, { cwd: '', abc: '123' })
  t.truthy(cli)

  const cli2 = new Cli({
    name: '',
    version: '',
    commands: []
  }, { abc: '123' })
  t.truthy(cli2)
})

test('run nested command', t => {
  const order = new Order(1)
  const cli = new Cli({
    name: 'clibuilder',
    version: '1.1.11',
    commands: [{
      name: 'cmd',
      run() {
        throw new Error('should not run')
      },
      commands: [{
        name: 'nested-cmd',
        run() {
          order.once(0)
        }
      }]
    }]
  }, { cwd: '', abc: '123' })
  cli.parse(createArgv('clibuilder', 'cmd', 'nested-cmd'))
  order.end()
  t.pass()
})
