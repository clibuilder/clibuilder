import { getCliCommand } from './getCliCommand'

test('command name preceed alias', () => {
  const actual = getCliCommand(['abc'], [{
    name: 'long-name',
    alias: ['abc'],
    run() { }
  }, {
    name: 'abc',
    run() { }
  }])!

  expect(actual.name).toBe('abc')
})
