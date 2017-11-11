import { test } from 'ava'

import { loadConfig } from './loadConfig'

test('no config gets undefined', t => {
  t.is(loadConfig('a.json', 'fixtures/no-config'), undefined)
})

test('should returns object literal and not JSON', t => {
  t.deepEqual(loadConfig('test-cli.json', 'fixtures/has-config'), { a: 1 })
})
