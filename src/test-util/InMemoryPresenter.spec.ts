import test from 'ava'
import { DisplayLevel } from '../Display'

import { InMemoryPresenter } from './InMemoryPresenter'

test('should default to verbose', t => {
  const p = new InMemoryPresenter({ name: 'a' })
  p.debug('d')
  p.error('e')
  p.warn('w')
  p.info('i')

  t.is(p.displayLevel, DisplayLevel.Verbose)
  const display = p.display
  t.is(display.debugLogs[0][0], 'd')
  t.is(display.warnLogs[0][0], 'w')
  t.is(display.errorLogs[0][0], 'e')
  t.is(display.infoLogs[0][0], 'i')
})
