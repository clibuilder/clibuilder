import { logLevel, getLevel } from 'aurelia-logging'
import test from 'ava'

import { createNoOpCli, createArgv } from './test/util'

const cli = createNoOpCli('logLevel')

test('with -V', t => {
  cli.run(createArgv('noop', '-V'))
  t.is(getLevel(), logLevel.debug)
})
test('with --verbose', t => {
  cli.run(createArgv('noop', '--verbose'))
  t.is(getLevel(), logLevel.debug)
})
test('with --silent', t => {
  cli.run(createArgv('noop', '--silent'))
  t.is(getLevel(), logLevel.none)
})

