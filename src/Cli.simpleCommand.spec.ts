// import { logLevel, getLevel } from 'aurelia-logging'
import test from 'ava'
import { stub } from 'sinon'

import { createCliWithCommands, createArgv } from './test/util'

test('invoke command by name', t => {
  const process = stub()
  const cli = createCliWithCommands({
    name: 'a',
    process
  })
  cli.run(createArgv('a'))

  t.true(process.called)
})
test('invoke command by alias', t => {
  const process = stub()
  const cli = createCliWithCommands({
    name: 'a',
    alias: ['b'],
    process
  })
  cli.run(createArgv('b'))
  t.true(process.called)
})
test('invoke command by second alias', t => {
  const process = stub()
  const cli = createCliWithCommands({
    name: 'a',
    alias: ['b', 'c'],
    process
  })
  cli.run(createArgv('c'))
  t.true(process.called)
})
