import t from 'assert'

import { loadConfig } from './loadConfig'

test('no config gets undefined', () => {
  t.equal(loadConfig('a.json', { cwd: 'fixtures/no-config' }), undefined)
})

test('should returns object literal and not JSON', () => {
  t.deepEqual(loadConfig('test-cli.json', { cwd: 'fixtures/has-config' }), { a: 1 })
})

test('should returns config from HOME when no local config', () => {
  t.deepEqual(loadConfig('test-cli.json', { cwd: 'fixtures/no-config', home: 'fixtures/has-config' }), { a: 1 })
})
