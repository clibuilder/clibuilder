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

test('answers value will be used during prompt', async () => {
  const p = new InMemoryPresenter({ name: 'a' }, { lang: 'abc' })

  const actual = await p.prompt([{ name: 'lang' }])
  expect(actual).toEqual({ lang: 'abc' })
})

test('function in answers will be used to process the question', async () => {
  const p = new InMemoryPresenter({ name: 'a' }, { lang: () => 'abc' })

  const actual = await p.prompt([{
    name: 'lang',
    type: 'list',
    choices: ['a', 'b', 'c'],
  }])

  expect(actual).toEqual({ lang: 'abc' })
})

test('function in answers receives the question', async () => {
  let actual: any
  const p = new InMemoryPresenter({ name: 'a' }, { lang: q => actual = q })

  await p.prompt([{
    name: 'lang',
    type: 'list',
    choices: ['a', 'b', 'c'],
  }])

  expect(actual).toEqual({
    name: 'lang',
    type: 'list',
    choices: ['a', 'b', 'c'],
  })
})
