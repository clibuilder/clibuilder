import t from 'assert'

import { generateDisplayedMessage } from '../index'

test('should join all messages into one per line', () => {
  const actual = generateDisplayedMessage([['a', 'b'], ['c']])
  t.deepStrictEqual(actual, `a b
c`)
})
