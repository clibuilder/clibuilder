import test from 'ava'

import { createInMemoryCli } from './setup'
import { getDisplay } from './getDisplay'

test('mem', t => {
  const cli = createInMemoryCli('abc')
  const actual = getDisplay(cli)
  t.truthy(actual)
  t.truthy(actual.debugLogs)
  t.truthy(actual.warnLogs)
  t.truthy(actual.infoLogs)
  t.truthy(actual.errorLogs)
})
