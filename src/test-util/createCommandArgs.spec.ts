import test from 'ava'

import { createCommandArgs } from './index'

import { noopCommand } from './noopCommand'
import { argCommand } from './argCommand'
import { booleanOptionsCommand } from './booleanOptionsCommand'

test('empty argv', t => {
  const args = createCommandArgs(noopCommand)

  t.deepEqual(args, { _: [], _defaults: [] })
})

test(`one argv`, t => {
  const args = createCommandArgs(argCommand, ['arg1'])

  t.deepEqual(args, { _: [], _defaults: [], 'some-arg': 'arg1' })
})

test(`boolean option using with '--'`, t => {
  const args = createCommandArgs(booleanOptionsCommand, ['--a'])

  t.deepEqual(args, { _: [], _defaults: [], a: true })
})
