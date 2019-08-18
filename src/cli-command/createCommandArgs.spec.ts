import t from 'assert';
import a from 'assertron';
import { argCommand, booleanOptionsCommand, createCommandArgs, noopCommand } from '../test-util';

test('empty argv', () => {
  const args = createCommandArgs(noopCommand)

  t.deepStrictEqual(args, { _: [], _defaults: [] })
})

test(`one argv`, () => {
  const args = createCommandArgs(argCommand, ['arg1'])

  a.satisfies(args, { 'required-arg': 'arg1', requiredArg: 'arg1' })
})

test(`boolean option using with '--'`, () => {
  const args = createCommandArgs(booleanOptionsCommand, ['--a'])

  t.deepStrictEqual(args, { _: [], _defaults: [], a: true })
})
