import t from 'assert'

import { createCommandArgs, argCommand, noopCommand, booleanOptionsCommand } from '../index'
import a from 'assertron';

test('empty argv', () => {
  const args = createCommandArgs(noopCommand)

  t.deepStrictEqual(args, { _: [], _defaults: [] })
})

test(`one argv`, () => {
  const args = createCommandArgs(argCommand, ['arg1'])

  a.satisfies(args, { 'some-arg': 'arg1', someArg: 'arg1' })
})

test(`boolean option using with '--'`, () => {
  const args = createCommandArgs(booleanOptionsCommand, ['--a'])

  t.deepStrictEqual(args, { _: [], _defaults: [], a: true })
})
