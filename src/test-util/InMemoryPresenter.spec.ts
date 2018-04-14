import t from 'assert'

import { DisplayLevel, InMemoryPresenter } from '../index'

test('should default to verbose', () => {
  const p = new InMemoryPresenter({ name: 'a' })
  p.debug('d')
  p.error('e')
  p.warn('w')
  p.info('i')

  t.equal(p.displayLevel, DisplayLevel.Verbose)
  const display = p.display
  t.equal(display.debugLogs[0][0], 'd')
  t.equal(display.warnLogs[0][0], 'w')
  t.equal(display.errorLogs[0][0], 'e')
  t.equal(display.infoLogs[0][0], 'i')
})
