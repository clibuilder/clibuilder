import test from 'ava'

import { generateDisplayedMessage } from '../index'

test('should join all messages into one per line', t => {
  const actual = generateDisplayedMessage([['a', 'b'], ['c']])
  t.deepEqual(actual, `a b
c`)
})
