import t from 'assert'

import { createCommandArgs, argCommand, noopCommand, booleanOptionsCommand } from '../index'
import { satisfy } from 'assertron';

test('empty argv', () => {
  const args = createCommandArgs(noopCommand)

  t.deepEqual(args, { _: [], _defaults: [] })
})

test(`one argv`, () => {
  const args = createCommandArgs(argCommand, ['arg1'])

  satisfy(args, { 'some-arg': 'arg1', someArg: 'arg1' })
})

test(`boolean option using with '--'`, () => {
  const args = createCommandArgs(booleanOptionsCommand, ['--a'])

  t.deepEqual(args, { _: [], _defaults: [], a: true })
})
