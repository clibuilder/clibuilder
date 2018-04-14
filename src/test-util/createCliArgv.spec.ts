import t from 'assert'

import { createCliArgv } from '../index'

test('make valid process.argv', () => {
  const actual = createCliArgv('cli', 'run')
  t.deepEqual(actual, ['node', 'cli', 'run'])
})
