import test from 'ava'

import { createCli } from './createCli'
import { getDisplay } from './getDisplay'

test('mem', t => {
  const cli = createCli('abc')
  const actual = getDisplay(cli)
  t.truthy(actual)
  t.truthy(actual.debugLogs)
  t.truthy(actual.warnLogs)
  t.truthy(actual.infoLogs)
  t.truthy(actual.errorLogs)
})
