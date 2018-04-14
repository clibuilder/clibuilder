import t from 'assert'

import { generateDisplayedMessage } from '../index'

test('should join all messages into one per line', () => {
  const actual = generateDisplayedMessage([['a', 'b'], ['c']])
  t.deepEqual(actual, `a b
c`)
})
