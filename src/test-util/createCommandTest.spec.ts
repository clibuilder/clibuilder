import { configCommand, contextCommand, createCommandTest, helloCommand } from '.'
import { argvCommand } from './argvCommand'

test('simple command', async () => {
  const { cli, argv } = createCommandTest(helloCommand)
  const result = await cli.parse(argv)

  expect(result).toEqual('hello')
})

test('command accepting arguments', async () => {
  const { cli, argv } = createCommandTest(argvCommand, 'abc')
  const result = await cli.parse(argv)

  expect(result).toEqual(['argv', 'abc'])
})

test('command expecting config', async () => {
  const { cli, argv } = createCommandTest(configCommand, { config: { a: 100 } })
  const result = await cli.parse(argv)

  expect(result).toEqual({ a: 100 })
})

test('command expecting context', async () => {
  const { cli, argv } = createCommandTest(contextCommand, { context: { foo() { return 'foo' } } })

  const result = await cli.parse(argv)

  expect(result.foo()).toEqual('foo')
})
