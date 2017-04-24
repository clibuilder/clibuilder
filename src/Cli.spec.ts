import { Cli, CommandSpec } from './index'
import { logLevel, getLevel } from 'aurelia-logging'

import { noopCommand, createCommand } from './test/commands'

describe('show help', () => {
  const cli = createNoCommandCli()
  beforeEach(() => {
    cli.showHelp = jest.fn()
  })
  test('when called with no parameter', () => {
    cli.run(['node', 'cli'])

    expect(cli.showHelp).toBeCalled()
  })
  test('when called with -h', () => {
    cli.run(['node', 'cli', '-h'])

    expect(cli.showHelp).toBeCalled()
  })
  test('when called with --help', () => {
    cli.run(['node', 'cli', '--help'])

    expect(cli.showHelp).toBeCalled()
  })
  test('when command not found', () => {
    cli.run(['node', 'cli', 'some'])

    expect(cli.showHelp).toBeCalled()
  })
})

describe('show version', () => {
  const cli = createNoCommandCli()
  beforeEach(() => {
    cli.showVersion = jest.fn()
  })
  test('with -v', () => {
    cli.run(['node', 'cli', '-v'])
    expect(cli.showVersion).toBeCalled()
  })

  test('with --version', () => {
    cli.run(['node', 'cli', '-v'])
    expect(cli.showVersion).toBeCalled()
  })
})

describe('set log level', () => {
  const cli = createNoOpCli()
  beforeEach(() => {
    cli.setLevel = jest.fn()
  })
  test('with -V', () => {
    cli.run(['node', 'cli', 'noop', '-V'])
    expect(getLevel()).toBe(logLevel.debug)
  })
  test('with --verbose', () => {
    cli.run(['node', 'cli', 'noop', '--verbose'])
    expect(getLevel()).toBe(logLevel.debug)
  })
  test('with --silent', () => {
    cli.run(['node', 'cli', 'noop', '--silent'])
    expect(getLevel()).toBe(logLevel.none)
  })
})

describe('simple command', () => {
  test('invoke command by name', () => {
    const process = jest.fn()
    const cli = createCliWithCommands({
      name: 'a',
      process
    })
    cli.run(['node', 'cli', 'a'])
    expect(process).toBeCalled()
  })
  test('invoke command by alias', () => {
    const process = jest.fn()
    const cli = createCliWithCommands({
      name: 'a',
      alias: ['b'],
      process
    })
    cli.run(['node', 'cli', 'b'])
    expect(process).toBeCalled()
  })
  test('invoke command by second alias', () => {
    const process = jest.fn()
    const cli = createCliWithCommands({
      name: 'a',
      alias: ['b', 'c'],
      process
    })
    cli.run(['node', 'cli', 'c'])
    expect(process).toBeCalled()
  })
})

function createNoCommandCli(): any {
  return createCliWithCommands()
}

function createNoOpCli(): any {
  return createCliWithCommands(noopCommand)
}

function createCliWithCommands(...commands: Array<CommandSpec & { process: any }>) {
  return new Cli('cli', '0.2.1', commands.map(c => createCommand(c)))
}
