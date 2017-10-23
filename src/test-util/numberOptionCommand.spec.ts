import { test } from 'ava'
import { createCommandArgs, createCommand, InMemoryPresenterFactory } from './index'
import { numberOptionCommand } from './numberOptionCommand'


test('number option', t => {
  const args = createCommandArgs(numberOptionCommand, ['-a 3'])
  t.deepEqual(args, { a: 3, _: [] })
})

test('log option', t => {
  const args = createCommandArgs(numberOptionCommand, ['-a 3'])

  const cmd = createCommand(numberOptionCommand, new InMemoryPresenterFactory(), {})
  t.plan(1)
  cmd.ui.info = msg => t.is(msg, `a: ${args.a}`)
  cmd.run(args, ['-a 3'])
})
