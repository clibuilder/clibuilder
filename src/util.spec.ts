import { getCommandAndAliasNames } from './util'
import { Command } from './Command'

describe('getCommandAndAliasNames()', () => {
  test('should return empty array with no commands defined', () => {
    assertGettingNamesAndAlias([], [])
  })

  test('should return command name', () => {
    assertGettingNamesAndAlias([{
      name: 'mycommand',
      run() { return }
    }], ['mycommand'])
  })
  test('should return alias too', () => {
    assertGettingNamesAndAlias([{
      name: 'cmdWithAlias',
      alias: ['ca'],
      run() { return }
    }], ['ca', 'cmdWithAlias'])
  })
  test('should sort names in alphabetical order', () => {
    assertGettingNamesAndAlias([{
      name: 'd',
      alias: ['c'],
      run() { return }
    }, {
      name: 'a',
      alias: ['b'],
      run() { return }
    }], ['a', 'b', 'c', 'd'])
  })
  function assertGettingNamesAndAlias(actual: Command[], names: string[]) {
    expect(getCommandAndAliasNames(actual)).toEqual(names)
  }
})
