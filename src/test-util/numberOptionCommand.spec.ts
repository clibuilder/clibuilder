import a from 'assertron'
import { createCliTest, numberOptionCommand } from '..'

test('using = syntax', async () => {
  const { cli, argv } = createCliTest({
    commands: [numberOptionCommand]
  }, 'number-option', '--value=3')
  const actual = await cli.parse(argv)

  a.satisfies(actual, { value: 3 })
})
