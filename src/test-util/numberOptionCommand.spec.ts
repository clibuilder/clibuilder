import t from 'assert'
import { AssertOrder } from 'assertron'
import { createCommandArgs, createCliCommand, InMemoryPresenterFactory, numberOptionCommand } from '../index'


test('number option', () => {
  const args = createCommandArgs(numberOptionCommand, ['-a 3'])
  t.deepStrictEqual(args, { a: 3, _: [], _defaults: [] })
})

test('log option', () => {
  const args = createCommandArgs(numberOptionCommand, ['-a 3'])
  const o = new AssertOrder(1)
  const cmd = createCliCommand(numberOptionCommand, { context: { presenterFactory: new InMemoryPresenterFactory() } })
  cmd.ui.info = msg => {
    o.once(1)
    t.strictEqual(msg, `a: ${args.a}`)
  }
  cmd.run(args, ['-a 3'])
  o.end()
})
