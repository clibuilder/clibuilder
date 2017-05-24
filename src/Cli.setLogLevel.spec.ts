import { logLevel, getLevel } from 'aurelia-logging'
import test from 'ava'

import { createNoOpCli } from './test/commands'

const cli = createNoOpCli()

test('with -V', t => {
  cli.run(['node', 'cli', 'noop', '-V'])
  t.is(getLevel(), logLevel.debug)
})
test('with --verbose', t => {
  cli.run(['node', 'cli', 'noop', '--verbose'])
  t.is(getLevel(), logLevel.debug)
})
test('with --silent', t => {
  cli.run(['node', 'cli', 'noop', '--silent'])
  t.is(getLevel(), logLevel.none)
})

