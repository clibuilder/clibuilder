import t from 'assert'

import { createInMemoryCli, getDisplay } from '../index'

test('mem', () => {
  const cli = createInMemoryCli('abc')
  const actual = getDisplay(cli)
  t(actual)
  t(actual.debugLogs)
  t(actual.warnLogs)
  t(actual.infoLogs)
  t(actual.errorLogs)
})
