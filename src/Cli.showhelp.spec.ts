import test from 'ava'
import { stub, SinonStub } from 'sinon'

import { createNoCommandCli, createArgv } from './test/util'

const cli = createNoCommandCli()
let showHelp: SinonStub
test.beforeEach(() => {
  showHelp = stub(cli, 'showHelp')
})
test.afterEach(() => {
  showHelp.restore()
})
test('when called with no parameter', t => {
  cli.run(createArgv())
  t.true(showHelp.called)
})
test('when called with -h', t => {
  cli.run(createArgv('-h'))

  t.true(showHelp.called)
})
test('when called with --help', t => {
  cli.run(createArgv('--help'))

  t.true(showHelp.called)
})
test('when command not found', t => {
  cli.run(createArgv('some'))

  t.true(showHelp.called)
})
