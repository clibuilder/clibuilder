import t from 'assert'
import { createCommandArgs, InMemoryPresenterFactory, numberOptionCommand } from '..'
import { createCliCommand } from '../cli-command'

test('number option', () => {
  const args = createCommandArgs(numberOptionCommand, ['--value=3'])
  t.deepStrictEqual(args, { value: 3, _: [], _defaults: [] })
})

test('log option', async () => {
  const argv = ['--value=3']
  const args = createCommandArgs(numberOptionCommand, argv)
  const cmd = createCliCommand(numberOptionCommand, { context: { presenterFactory: new InMemoryPresenterFactory() } })
  const actual = await cmd.run(args, argv)
  expect(actual).toBe(3)
})
