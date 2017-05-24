import test from 'ava'
import { stub, SinonStub } from 'sinon'

import { createNoCommandCli } from './test/commands'

const cli = createNoCommandCli()
let showVersion: SinonStub
test.beforeEach(() => {
  showVersion = stub(cli, 'showVersion')
})
test.afterEach(() => {
  showVersion.restore()
})
test('with -v', t => {
  cli.run(['node', 'cli', '-v'])
  t.true(showVersion.called)
})

test('with --version', t => {
  cli.run(['node', 'cli', '-v'])
  t.true(showVersion.called)
})
