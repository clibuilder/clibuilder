import t from 'assert'

import { getCliCommand } from './getCliCommand'
import { InMemoryPresenterFactory, createCliCommand } from './index'

function getCommandAndAliasNames(commands: { name: string, alias?: string[] }[]) {
  const names: string[] = []
  commands.forEach(cmd => {
    names.push(cmd.name)
    if (cmd.alias) {
      names.push(...cmd.alias)
    }
  })
  return names.sort()
}

function assertGettingNamesAndAlias(actual: { name: string, alias?: string[] }[], names: string[]) {
  t.deepStrictEqual(getCommandAndAliasNames(actual), names)
}

test('should return empty array with no commands defined', () => {
  assertGettingNamesAndAlias([], [])
})

test('should return command name', () => {
  assertGettingNamesAndAlias([{
    name: 'mycommand'
  }], ['mycommand'])
})
test('should return alias too', () => {
  assertGettingNamesAndAlias([{
    name: 'cmdWithAlias',
    alias: ['ca']
  }], ['ca', 'cmdWithAlias'])
})
test('should sort names in alphabetical order', () => {
  assertGettingNamesAndAlias([{
    name: 'd',
    alias: ['c']
  }, {
    name: 'a',
    alias: ['b']
  }], ['a', 'b', 'c', 'd'])
})

test('run 1st level command', () => {
  const cli = {
    name: 'clibuilder',
    commands: [{
      name: 'cmd',
      commands: [{
        name: 'nested-cmd'
      }]
    }]
  }
  const cmd = createCliCommand(cli, new InMemoryPresenterFactory(), { cwd: '.', parent: undefined })
  const actual = getCliCommand(['clibuilder', 'cmd'], [cmd])
  t.notStrictEqual(actual, undefined)
  t.strictEqual(actual!.name, 'cmd')
})

test('two sub commands should have the same parent', () => {
  const cli = {
    name: 'clibuilder',
    commands: [{
      name: 'cmd1'
    }, {
      name: 'cmd2'
    }]
  }
  const cmd = createCliCommand(cli, new InMemoryPresenterFactory(), { cwd: '.', parent: undefined })
  cmd.commands!.forEach(c => {
    t.strictEqual(c.parent, cmd)
  })
})

test('specifying Config will get completion support on context', () => {
  const cli = {
    name: 'clibuilder',
    commands: [{
      name: 'cmd1'
    }]
  }
  const cmd = createCliCommand<{ foo: string }>(cli, new InMemoryPresenterFactory(), { cwd: '.', parent: undefined, config: { foo: 'a' } })
  cmd.commands!.forEach(c => {
    t.strictEqual(c.parent, cmd)
  })
})
