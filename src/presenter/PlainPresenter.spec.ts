import t from 'assert'
import { PlainPresenter } from '.'
import { InMemoryDisplay } from '../test-util'
import { DisplayLevel } from './interfaces'

test('should default to print info, warn, error messages', () => {
  const p = new PlainPresenter({ name: 'a' })
  const display = new InMemoryDisplay()
  p.display = display
  p.debug('d')
  p.error('e')
  p.warn('w')
  p.info('i')
  t.strictEqual(display.debugLogs.length, 0)
  t.strictEqual(display.warnLogs[0][0], 'w')
  t.strictEqual(display.errorLogs[0][0], 'e')
  t.strictEqual(display.infoLogs[0][0], 'i')
})

test('help message indicates default boolean option', () => {
  const p = new PlainPresenter({ name: 'a' })
  const display = new InMemoryDisplay()
  p.display = display
  p.showHelp({
    name: 'a', options: {
      boolean: { 'some-option': { description: 'some description', default: true } },
    },
  })
  t.strictEqual(display.infoLogs[0][0], `
Usage: a

Options:
  [--some-option]        some description (default true)
`)
})

test('single character option should use with single dash', () => {
  const p = new PlainPresenter({ name: 'a' })
  const display = new InMemoryDisplay()
  p.display = display
  p.showHelp({
    name: 'a', options: {
      boolean: { 'x': { description: 'some description', default: true } },
    },
  })
  t.strictEqual(display.infoLogs[0][0], `
Usage: a

Options:
  [-x]                   some description (default true)
`)
})

test('multi-character option alias should be use with double dash', () => {
  const p = new PlainPresenter({ name: 'a' })
  const display = new InMemoryDisplay()
  p.display = display
  p.showHelp({
    name: 'a', options: {
      boolean: { 'some-option': { alias: ['sopt'], description: 'some description', default: true } },
    },
  })
  t.strictEqual(display.infoLogs[0][0], `
Usage: a

Options:
  [--sopt|--some-option]  some description (default true)
`)
})

test('option and its alias should be sorted by length', () => {
  const p = new PlainPresenter({ name: 'a' })
  const display = new InMemoryDisplay()
  p.display = display
  p.showHelp({
    name: 'a', options: {
      boolean: { 'some-option': { alias: ['sopt', 'o'], description: 'some description', default: true } },
    },
  })
  t.strictEqual(display.infoLogs[0][0], `
Usage: a

Options:
  [-o|--sopt|--some-option]  some description (default true)
`)
})

test('help message indicates default string option', () => {
  const p = new PlainPresenter({ name: 'a' })
  const display = new InMemoryDisplay()
  p.display = display
  p.showHelp({
    name: 'a', options: {
      string: { 'some-option': { description: 'some description', default: 'yes' } },
    },
  })
  t.strictEqual(display.infoLogs[0][0], `
Usage: a

Options:
  [--some-option]=value  some description (default 'yes')
`)
})

test('nested command shows only top level', () => {
  const p = new PlainPresenter({ name: 'a' })
  const display = new InMemoryDisplay()
  p.display = display
  p.showHelp({
    name: 'cli',
    options: {
      string: { 'some-option': { description: 'some description', default: 'yes' } },
    },
    commands: [{
      name: 'command-1',
      commands: [{
        name: 'nested-command',
      }],
    }, {
      name: 'command-2',
      alias: ['c2'],
    }],
  })
  t.strictEqual(display.infoLogs[0][0], `
Usage: cli <command>

Commands:
  command-1, command-2 (c2)

cli <command> -h         Get help for <command>

Options:
  [--some-option]=value  some description (default 'yes')
`)
})

test('help message shows alias', () => {
  const p = new PlainPresenter({ name: 'a' })
  const display = new InMemoryDisplay()
  p.display = display
  p.showHelp({
    name: 'long-name',
    alias: ['b'],
  })
  t.strictEqual(display.infoLogs[0][0], `
Usage: long-name

Alias:
  b
`)
})

test('setDisplayLevel', () => {
  const p = new PlainPresenter({ name: 'a' })
  const display = new InMemoryDisplay()
  p.display = display
  p.setDisplayLevel(DisplayLevel.Silent)
  p.debug('d')
  p.info('i')
  p.error('e')
  p.warn('w')
  t.strictEqual(display.debugLogs.length, 0)
  t.strictEqual(display.infoLogs.length, 0)
  t.strictEqual(display.warnLogs.length, 0)
  t.strictEqual(display.errorLogs.length, 0)
})
