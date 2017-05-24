// import { logLevel, getLevel } from 'aurelia-logging'
import test from 'ava'
import { stub } from 'sinon'

import { createCliWithCommands } from './test/commands'

test('invoke command by name', t => {
  const process = stub()
  const cli = createCliWithCommands({
    name: 'a',
    process
  })
  cli.run(['node', 'cli', 'a'])

  t.true(process.called)
})
test('invoke command by alias', t => {
  const process = stub()
  const cli = createCliWithCommands({
    name: 'a',
    alias: ['b'],
    process
  })
  cli.run(['node', 'cli', 'b'])
  t.true(process.called)
})
test('invoke command by second alias', t => {
  const process = stub()
  const cli = createCliWithCommands({
    name: 'a',
    alias: ['b', 'c'],
    process
  })
  cli.run(['node', 'cli', 'c'])
  t.true(process.called)
})
