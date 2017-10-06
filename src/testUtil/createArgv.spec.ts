import test from 'ava'

import { createArgv } from './createArgv'

test('make valid process.argv', t => {
  const actual = createArgv('cli', 'run')
  t.deepEqual(actual, ['node', 'cli', 'run'])
})
