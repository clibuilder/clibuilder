import test from 'ava'
import { stub, SinonStub } from 'sinon'

import { createNoCommandCli, createArgv } from './test/util'

const cli = createNoCommandCli()
let showVersion: SinonStub
test.beforeEach(() => {
  showVersion = stub(cli, 'showVersion')
})
test.afterEach(() => {
  showVersion.restore()
})
test('with -v', t => {
  cli.run(createArgv('-v'))
  t.true(showVersion.called)
})

test('with --version', t => {
  cli.run(createArgv('--version'))
  t.true(showVersion.called)
})
