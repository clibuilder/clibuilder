import test from 'ava'

import { memoryAppender } from './test/setup'
import { createNoCommandCli, createArgv } from './test/util'

const cli = createNoCommandCli('showHelp')
test.beforeEach(() => {
  memoryAppender.logs = []
})
test('when called with no parameter', t => {
  cli.run(createArgv())
})
test('when called with -h', t => {
  cli.run(createArgv('-h'))
})
test('when called with --help', t => {
  cli.run(createArgv('--help'))
})
test('when command not found', t => {
  cli.run(createArgv('some'))
})
