import test, { TestContext } from 'ava'

import { getCommandAndAliasNames, getCommand, createCommand } from './util'
import { InMemoryPresenterFactory } from './test-util/InMemoryPresenterFactory';

test('should return empty array with no commands defined', t => {
  assertGettingNamesAndAlias(t, [], [])
})

test('should return command name', t => {
  assertGettingNamesAndAlias(t, [{
    name: 'mycommand'
  }], ['mycommand'])
})
test('should return alias too', t => {
  assertGettingNamesAndAlias(t, [{
    name: 'cmdWithAlias',
    alias: ['ca']
  }], ['ca', 'cmdWithAlias'])
})
test('should sort names in alphabetical order', t => {
  assertGettingNamesAndAlias(t, [{
    name: 'd',
    alias: ['c']
  }, {
    name: 'a',
    alias: ['b']
  }], ['a', 'b', 'c', 'd'])
})
function assertGettingNamesAndAlias(t: TestContext, actual: { name: string, alias?: string[] }[], names: string[]) {
  t.deepEqual(getCommandAndAliasNames(actual), names)
}

test('run 1st level command', t => {
  const cli = {
    name: 'clibuilder',
    commands: [{
      name: 'cmd',
      commands: [{
        name: 'nested-cmd'
      }]
    }]
  }
  const cmd = createCommand(cli, new InMemoryPresenterFactory(), { cwd: '.', parent: undefined })
  const actual = getCommand(['clibuilder', 'cmd'], [cmd])
  t.not(actual, undefined)
  t.is(actual!.name, 'cmd')
})
