import test from 'ava'

import { memoryAppender } from './test/setup'
import { createNoCommandCli, createArgv } from './test/util'

const cli = createNoCommandCli('showVersion')
test.beforeEach(() => {
  memoryAppender.logs = []
})

test('with -v', t => {
  cli.run(createArgv('-v'))
  t.is(memoryAppender.logs[0].messages[0], '0.0.0')
})

test('with --version', t => {
  cli.run(createArgv('--version'))
  t.is(memoryAppender.logs[0].messages[0], '0.0.0')
})
