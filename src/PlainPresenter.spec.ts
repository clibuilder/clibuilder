import test from 'ava'
import { InMemoryDisplay } from './test/InMemoryDisplay'

import { PlainPresenter } from './PlainPresenter'

test('should default to print info, warn, error messages', t => {
  const p = new PlainPresenter({ name: 'a' })
  const display = new InMemoryDisplay()
  p.display = display
  p.debug('d')
  p.error('e')
  p.warn('w')
  p.info('i')
  t.is(display.debugLogs.length, 0)
  t.is(display.warnLogs[0][0], 'w')
  t.is(display.errorLogs[0][0], 'e')
  t.is(display.infoLogs[0][0], 'i')
})
