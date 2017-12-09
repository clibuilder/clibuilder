import test from 'ava'

import { createCommandArgs, argCommand, noopCommand, booleanOptionsCommand } from '../index'
import { satisfy } from 'assertron';

test('empty argv', t => {
  const args = createCommandArgs(noopCommand)

  t.deepEqual(args, { _: [], _defaults: [] })
})

test(`one argv`, t => {
  const args = createCommandArgs(argCommand, ['arg1'])

  satisfy(args, { 'some-arg': 'arg1', someArg: 'arg1' })
  t.pass()
})

test(`boolean option using with '--'`, t => {
  const args = createCommandArgs(booleanOptionsCommand, ['--a'])

  t.deepEqual(args, { _: [], _defaults: [], a: true })
})
