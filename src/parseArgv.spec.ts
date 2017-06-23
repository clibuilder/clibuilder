import test from 'ava'

import { parseArgv } from './parseArgv'
import { createCommand } from './util'

test('no arguments and options', t => {
  const cmd = createCommand({ name: 'a' }, { cwd: '' })
  const argv = ['a']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [] })
})

test('throws with additional argument', t => {
  const cmd = createCommand({ name: 'a', arguments: [{ name: 'b' }] }, { cwd: '' })
  const argv = ['a', 'b', 'c']
  t.throws(() => parseArgv(cmd, argv))
})

test('throws with missing argument', t => {
  const cmd = createCommand({ name: 'a', arguments: [{ name: 'b', required: true }] }, { cwd: '' })
  const argv = ['a']
  t.throws(() => parseArgv(cmd, argv))
})

test('not throw when there are sub-commands', t => {
  const cmd = createCommand({
    name: 'a',
    commands: [createCommand({ name: 'b' }, { cwd: '' })]
  }, { cwd: '' })

  let argv = ['a', 'b']
  t.notThrows(() => parseArgv(cmd, argv))
  argv = ['a', '--verbose']
  t.notThrows(() => parseArgv(cmd, argv))
})

test('with arguments', t => {
  const cmd = createCommand({
    name: 'a',
    arguments: [{ name: 'x', required: true }]
  }, { cwd: '' })
  const argv = ['a', 'c']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: ['c'] })
})

test('throw with unknown options', t => {
  const cmd = createCommand({
    name: 'a',
    options: {
      boolean: {
        silent: {
          description: 'silent',
          alias: ['S']
        }
      }
    }
  }, { cwd: '' })
  const argv = ['a', '--something']
  t.throws(() => parseArgv(cmd, argv))
})

test('with boolean options', t => {
  const cmd = createCommand({
    name: 'a',
    options: {
      boolean: {
        verbose: {
          description: 'Turn on verbose',
          alias: ['V'],
          default: true
        }
      }
    }
  }, { cwd: '' })

  let argv = ['a', '--verbose']
  let actual = parseArgv(cmd, argv)

  t.deepEqual(actual, { _: [], 'verbose': true, 'V': true })

  argv = ['a', '-V']
  actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], 'verbose': true, 'V': true })
})

test('fill default for boolean option', t => {
  const cmd = createCommand({
    name: 'a',
    options: {
      boolean: {
        x: {
          description: 'xx',
          default: true
        }
      }
    }
  }, { cwd: '' })
  const argv = ['a']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], x: true })
})

test('fill default for string option', t => {
  const cmd = createCommand({
    name: 'a',
    options: {
      string: {
        x: {
          description: 'xx',
          default: 'abc'
        }
      }
    }
  }, { cwd: '' })
  const argv = ['a']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], x: 'abc' })
})
