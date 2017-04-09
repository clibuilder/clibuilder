import { create } from './create'
import { logLevel } from 'aurelia-logging'

describe('show help', () => {
  test('when called with no parameter', () => {
    const cli = createNoCommandCli()
    cli.showHelp = jest.fn()

    cli.run(['node', 'cli'])

    expect(cli.showHelp).toBeCalled()
  })
  test('when called with -h', () => {
    const cli = createNoCommandCli()
    cli.showHelp = jest.fn()

    cli.run(['node', 'cli', '-h'])

    expect(cli.showHelp).toBeCalled()
  })
  test('when called with --help', () => {
    const cli = createNoCommandCli()
    cli.showHelp = jest.fn()

    cli.run(['node', 'cli', '--help'])

    expect(cli.showHelp).toBeCalled()
  })
  test('when command not found', () => {
    const cli = createNoCommandCli()
    cli.showHelp = jest.fn()

    cli.run(['node', 'cli', 'some'])

    expect(cli.showHelp).toBeCalled()
  })
})

describe('show version', () => {
  test('with -v', () => {
    const cli = createNoCommandCli()
    cli.showVersion = jest.fn()

    cli.run(['node', 'cli', '-v'])
    expect(cli.showVersion).toBeCalled()
  })

  test('with --version', () => {
    const cli = createNoCommandCli()
    cli.showVersion = jest.fn()

    cli.run(['node', 'cli', '-v'])
    expect(cli.showVersion).toBeCalled()
  })
})

describe('set log level', () => {
  test('with -V', () => {
    const cli = createNoOpCli()
    cli.setLevel = jest.fn()

    cli.run(['node', 'cli', 'nop', '-V'])
    expect(cli.setLevel).toBeCalledWith(logLevel.debug)
  })
  test('with --verbose', () => {
    const cli = createNoOpCli()
    cli.setLevel = jest.fn()

    cli.run(['node', 'cli', 'nop', '--verbose'])
    expect(cli.setLevel).toBeCalledWith(logLevel.debug)
  })
  test('with --silent', () => {
    const cli = createNoOpCli()
    cli.setLevel = jest.fn()

    cli.run(['node', 'cli', 'nop', '--silent'])
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
    cli.run(['node', 'cli', 'a'])
    expect(run).toBeCalled()
  })
})

function createNoCommandCli(): any {
  return createCliWithCommands()
}

function createNoOpCli(): any {
  return createCliWithCommands({
    name: 'nop',
    run: () => { return }
  })
}

function createCliWithCommands(...commands) {
  return create({
    name: 'cli',
    version: '0.2.1',
    commands
  })
}
