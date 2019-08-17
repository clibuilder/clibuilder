import { findCliCommand } from '.';
import { Cli } from '../cli';

const cmd1 = {
  name: 'cmd1',
  run() { return },
}
const cmd3 = {
  name: 'cmd3',
  run() { return },
}
const cmd2 = {
  name: 'cmd2',
  commands: [cmd3],
}

const cli = new Cli({
  name: 'cli',
  version: '',
  commands: [cmd1, cmd2],
})

test('not exist name returns undefined', () => {
  const actual = findCliCommand(cli, 'x')
  expect(actual).toBeUndefined()
})

test('find found command', () => {
  const actual = findCliCommand(cli, 'cmd1')
  expect(actual!.name).toBe(cmd1.name)
})

test('find nested command', () => {
  const actual = findCliCommand(cli, 'cmd2', 'cmd3')
  expect(actual!.name).toBe(cmd3.name)
})

test('get undefined if trying to find nested command on command with no children', () => {
  const actual = findCliCommand(cli, 'cmd1', 'cmd3')
  expect(actual).toBeUndefined()
})
