import test, { TestContext } from 'ava'

import { getCommandAndAliasNames } from './util'

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
