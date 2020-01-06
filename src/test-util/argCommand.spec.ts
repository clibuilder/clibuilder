import a from 'assertron'
import { argCommand } from '..'
import { createCliTest } from './createCliTest'

test('argument command', async () => {
  const { cli, argv } = createCliTest({
    commands: [argCommand]
  }, 'arg', 'abc')
  const actual = await cli.parse(argv)

  a.satisfies(actual, { 'required-arg': 'abc' })
})
