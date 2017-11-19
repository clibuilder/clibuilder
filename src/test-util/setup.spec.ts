import { test } from 'ava'

import { setupCommandTest, CliCommand } from '../index'

test('specifying Config gets completion support', t => {
  const cmd: CliCommand<{ foo: string }, { boo: string }> = {
    name: 'cmd'
  }
  // as of tsc@2.6.1, the inferring completion is not complete,
  // it gets `config` but not `boo`,
  // and inside `config` it does not get `foo`.
  // Explicit generic does not have this problem.
  setupCommandTest<{ foo: string }, { boo: string }>(cmd, [], { boo: 'boo', config: { foo: 'foo' } })
  t.pass()
})
