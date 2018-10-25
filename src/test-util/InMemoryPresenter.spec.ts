import t from 'assert'

import { DisplayLevel, InMemoryPresenter } from '../index'

test('should default to verbose', () => {
  const p = new InMemoryPresenter({ name: 'a' })
  p.debug('d')
  p.error('e')
  p.warn('w')
  p.info('i')

  t.strictEqual(p.displayLevel, DisplayLevel.Verbose)
  const display = p.display
  t.strictEqual(display.debugLogs[0][0], 'd')
  t.strictEqual(display.warnLogs[0][0], 'w')
  t.strictEqual(display.errorLogs[0][0], 'e')
  t.strictEqual(display.infoLogs[0][0], 'i')
})
