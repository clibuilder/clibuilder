import { getCommandAndAliasNames } from './Command'

describe('getCommandAndAliasNames()', () => {
  test('should return empty array with no commands defined', () => {
    expect(getCommandAndAliasNames([])).toEqual([])
  })

  test('should return command name', () => {
    assertNamesAre(getCommandAndAliasNames([{
      name: 'mycommand',
      run() { return }
    }]), 'mycommand')
  })
  test('should return alias too', () => {
    assertNamesAre(getCommandAndAliasNames([{
      name: 'cmdWithAlias',
      alias: ['ca'],
      run() { return }
    }]), 'ca', 'cmdWithAlias')
  })
  test('should sort names in alphabetical order', () => {
    assertNamesAre(getCommandAndAliasNames([{
      name: 'd',
      alias: ['c'],
      run() { return }
    }, {
      name: 'a',
      alias: ['b'],
      run() { return }
    }]), 'a', 'b', 'c', 'd')
  })
  function assertNamesAre(actual: string[], ...names: string[]) {
    expect(actual).toEqual(names)
  }
})
