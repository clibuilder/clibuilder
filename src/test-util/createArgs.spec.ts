import test from 'ava'

import { createCommandArgs } from './index'

import { noopCommand } from './noopCommand'
import { argCommand } from './argCommand'
import { optionsCommand } from './optionsCommand'
import { stringOptionCommand } from './stringOptionCommand'

test('empty argv', t => {
  const args = createCommandArgs(noopCommand, [])

  t.deepEqual(args, { _: [] })
})

test(`one argv`, t => {
  const args = createCommandArgs(argCommand, ['arg1'])

  t.deepEqual(args, { _: ['arg1'] })
})

test(`using --option[--a]`, t => {
  const args = createCommandArgs(optionsCommand, ['--a'])
  t.deepEqual(args, { a: true, b: false, _: [] })
})

test('named option with =', t => {
  const args = createCommandArgs(stringOptionCommand, ['--a=abc'])

  t.deepEqual(args, { a: 'abc', _: [] })
})

test.failing('named option with space', t => {
  const args = createCommandArgs(stringOptionCommand, ['-a 3'])

  t.deepEqual(args, { a: '3', _: [] })
})

test('named option without space', t => {
  const args = createCommandArgs(stringOptionCommand, ['-a5'])

  t.deepEqual(args, { a: '5', _: [] })
})
