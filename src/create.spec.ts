import { create, Command } from './index'
import { logLevel } from 'aurelia-logging'
import { noopCommand } from './test/commands'

describe('show help', () => {
  const cli = createNoCommandCli()
  beforeEach(() => {
    cli.showHelp = jest.fn()
  })
  test('when called with no parameter', () => {
    cli.process(['node', 'cli'])

    expect(cli.showHelp).toBeCalled()
  })
  test('when called with -h', () => {
    cli.process(['node', 'cli', '-h'])

    expect(cli.showHelp).toBeCalled()
  })
  test('when called with --help', () => {
    cli.process(['node', 'cli', '--help'])

    expect(cli.showHelp).toBeCalled()
  })
  test('when command not found', () => {
    cli.process(['node', 'cli', 'some'])

    expect(cli.showHelp).toBeCalled()
  })
})

describe('show version', () => {
  const cli = createNoCommandCli()
  beforeEach(() => {
    cli.showVersion = jest.fn()
  })
  test('with -v', () => {
    cli.process(['node', 'cli', '-v'])
    expect(cli.showVersion).toBeCalled()
  })

  test('with --version', () => {
    cli.process(['node', 'cli', '-v'])
    expect(cli.showVersion).toBeCalled()
  })
})

describe('set log level', () => {
  const cli = createNoOpCli()
  beforeEach(() => {
    cli.setLevel = jest.fn()
  })
  test('with -V', () => {
    cli.process(['node', 'cli', 'noop', '-V'])
    expect(cli.setLevel).toBeCalledWith(logLevel.debug)
  })
  test('with --verbose', () => {
    cli.process(['node', 'cli', 'noop', '--verbose'])
    expect(cli.setLevel).toBeCalledWith(logLevel.debug)
  })
  test('with --silent', () => {
    cli.process(['node', 'cli', 'noop', '--silent'])
    expect(cli.setLevel).toBeCalledWith(logLevel.none)
  })
})

describe('simple command', () => {
  test('invoke command by name', () => {
    const run = jest.fn()
    const cli = createCliWithCommands({
      name: 'a',
      run
    })
    cli.process(['node', 'cli', 'a'])
    expect(run).toBeCalled()
  })
  test('invoke command by alias', () => {
    const run = jest.fn()
    const cli = createCliWithCommands({
      name: 'a',
      alias: ['b'],
      run
    })
    cli.process(['node', 'cli', 'b'])
    expect(run).toBeCalled()
  })
  test('invoke command by alias2', () => {
    const run = jest.fn()
    const cli = createCliWithCommands({
      name: 'a',
      alias: ['b', 'c'],
      run
    })
    cli.process(['node', 'cli', 'c'])
    expect(run).toBeCalled()
  })
})

function createNoCommandCli(): any {
  return createCliWithCommands()
}

function createNoOpCli(): any {
  return createCliWithCommands(noopCommand)
}

function createCliWithCommands(...commands: Command[]) {
  return create({
    name: 'cli',
    version: '0.2.1',
    commands
  })
}
