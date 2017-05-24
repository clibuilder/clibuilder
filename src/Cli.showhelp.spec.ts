import test from 'ava'
import { stub, SinonStub } from 'sinon'

import { createNoCommandCli } from './test/commands'

const cli = createNoCommandCli()
let showHelp: SinonStub
test.beforeEach(() => {
  showHelp = stub(cli, 'showHelp')
})
test.afterEach(() => {
  showHelp.restore()
})
test('when called with no parameter', t => {
  cli.run(['node', 'cli'])
  t.true(showHelp.called)
})
test('when called with -h', t => {
  cli.run(['node', 'cli', '-h'])

  t.true(showHelp.called)
})
test('when called with --help', t => {
  cli.run(['node', 'cli', '--help'])

  t.true(showHelp.called)
})
test('when command not found', t => {
  cli.run(['node', 'cli', 'some'])

  t.true(showHelp.called)
})
