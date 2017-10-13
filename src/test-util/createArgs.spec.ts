import test from 'ava'

import { createCommandArgs } from './index'

import { noopCommand } from './noopCommand'
import { argCommand } from './argCommand'
import { booleanOptionsCommand } from './booleanOptionsCommand'
import { stringOptionCommand } from './stringOptionCommand'

test('empty argv', t => {
  const args = createCommandArgs(noopCommand, [])

  t.deepEqual(args, { _: [] })
})

test(`one argv`, t => {
  const args = createCommandArgs(argCommand, ['arg1'])

  t.deepEqual(args, { _: ['arg1'] })
})

test(`boolean option using with '--'`, t => {
  const args = createCommandArgs(booleanOptionsCommand, ['--a'])

  t.deepEqual(args, { a: true, b: false, _: [] })
})

test('string option with =', t => {
  const args = createCommandArgs(stringOptionCommand, ['--a=abc'])

  t.deepEqual(args, { a: 'abc', _: [] })
})

test.failing('string option with space', t => {
  const args = createCommandArgs(stringOptionCommand, ['-a 3'])

  t.deepEqual(args, { a: '3', _: [] })
})

test('string option without space', t => {
  const args = createCommandArgs(stringOptionCommand, ['-a5'])

  t.deepEqual(args, { a: '5', _: [] })
})
