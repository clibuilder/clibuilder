import t from 'assert'
import a from 'assertron'

import { setupCliCommandTest, argCommand, stringOptionCommand } from '../index'


test('string option with space', () => {
  const { args } = setupCliCommandTest(stringOptionCommand, ['-a 3'])

  t.deepStrictEqual(args, { a: '3', _: [], _defaults: [] })
})

test('string option with =', () => {
  const { args } = setupCliCommandTest(stringOptionCommand, ['-a=abc'])

  t.deepStrictEqual(args, { a: 'abc', _: [], _defaults: [] })
})

test('string option without space', () => {
  const { args } = setupCliCommandTest(stringOptionCommand, ['-a5'])

  t.deepStrictEqual(args, { a: '5', _: [], _defaults: [] })
})

test('specify option multiple times', () => {
  const { args } = setupCliCommandTest(stringOptionCommand, ['-a=abc', '-a=def'])

  t.deepStrictEqual(args, { a: ['abc', 'def'], _: [], _defaults: [] })
})

test('log option', () => {
  const { cmd, args, argv, ui } = setupCliCommandTest(stringOptionCommand, ['-a 3'])

  cmd.run(args, argv)

  t.strictEqual(ui.display.infoLogs[0][0], 'a: 3')
})

test('argument command', () => {
  const { cmd, args, argv, ui } = setupCliCommandTest(argCommand, ['abc'])

  a.satisfies(args, { 'some-arg': 'abc', someArg: 'abc' })

  cmd.run(args, argv)
  t.strictEqual(ui.display.infoLogs[0][0], 'some-arg: abc')
})
