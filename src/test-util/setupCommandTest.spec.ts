import { createCommand, generateDisplayedMessage, setupCommandTest } from '..'

const echoCmd = createCommand({
  name: 'echo',
  description: 'echo',
  arguments: [{
    name: 'value'
  }],
  run({ value }) {
    this.ui.info(value)
    return value
  }
})

test('simple', async () => {
  const { cli, ui, argv } = setupCommandTest(echoCmd, 'hello')
  const actual = await cli.parse(argv)
  expect(actual).toBe('hello')
  const msg = generateDisplayedMessage(ui.display.infoLogs)
  expect(msg).toBe('hello')
})

const ctxCmd = createCommand({
  name: 'ctx',
  description: 'ctx',
  arguments: [{
    name: 'value'
  }],
  context: {
    pad: (x: string) => `${x} +pad`
  },
  run({ value }) {
    return this.pad(value!)
  }
})

test('with context', async () => {
  const { cli, argv } = setupCommandTest(ctxCmd, {
    context: {
      pad: (x: string) => `${x} -pad`
    }
  }, 'hello')
  const actual = await cli.parse(argv)
  expect(actual).toBe('hello -pad')
})

const cfgCmd = createCommand({
  name: 'cfg',
  description: 'cfg',
  config: { x: '' },
  run() {
    return this.config.x
  }
})

test('with config', async () => {
  const { cli, argv } = setupCommandTest(cfgCmd, {
    config: { x: 'hello' }
  })
  const actual = await cli.parse(argv)
  expect(actual).toBe('hello')
})
