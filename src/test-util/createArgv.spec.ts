import test from 'ava'

import { createCliArgv } from './index'

test('make valid process.argv', t => {
  const actual = createCliArgv('cli', 'run')
  t.deepEqual(actual, ['node', 'cli', 'run'])
})
