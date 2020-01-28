import t from 'assert'
import { loadConfig } from './loadConfig'

test('no config gets undefined', () => {
  t.strictEqual(loadConfig('a', { cwd: 'fixtures/no-config' }), undefined)
})

test('should returns object literal and not JSON', () => {
  t.deepStrictEqual(loadConfig('test-cli', { cwd: 'fixtures/has-config' }), { a: 1 })
})

test('should returns object literal and not JSON', () => {
  t.deepStrictEqual(loadConfig('test-cli', { cwd: 'fixtures/has-js-config' }), { a: 1 })
})

test('should returns object literal and not JSON', () => {
  t.deepStrictEqual(loadConfig('test-cli', { cwd: 'fixtures/has-rc-config' }), { a: 1 })
})

test('should returns config from HOME when no local config', () => {
  t.deepStrictEqual(loadConfig('test-cli', { cwd: 'fixtures/no-config', home: 'fixtures/has-config' }), { a: 1 })
})
