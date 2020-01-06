import t from 'assert'
import a from 'assertron'
import { stringOptionCommand } from '../index'
import { createCliTest } from './createCliTest'



test('string option with space', async () => {
  const { cli, argv } = createCliTest({
    commands: [stringOptionCommand]
  }, 'opt', '-a', '3')
  const actual = await cli.parse(argv)

  a.satisfies(actual, { a: '3' })
})

test('string option with =', async () => {
  const { cli, argv } = createCliTest({
    commands: [stringOptionCommand]
  }, 'opt', '-a=abc')
  const actual = await cli.parse(argv)

  a.satisfies(actual, { a: 'abc' })
})

test('string option without space', async () => {
  const { cli, argv } = createCliTest({
    commands: [stringOptionCommand]
  }, 'opt', '-a5')
  const actual = await cli.parse(argv)

  a.satisfies(actual, { a: '5' })
})

// Note: TypeScript can't handle this.
// `run(args) { args.a /* typed as string instead of string[] */}`
test('specify option multiple times', async () => {
  const { cli, argv } = createCliTest({
    commands: [stringOptionCommand]
  }, 'opt', '-a=abc', '-a=def')
  const actual = await cli.parse(argv)

  a.satisfies(actual, { a: ['abc', 'def'] })
})

test('log option', async () => {
  const { cli, argv, ui } = createCliTest({
    commands: [stringOptionCommand]
  }, 'opt', '-a', '3')
  const actual = await cli.parse(argv)

  a.satisfies(actual, { a: '3' })


  t.strictEqual(ui.display.infoLogs[0][0], 'a: 3')
})
