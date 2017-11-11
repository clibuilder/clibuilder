import test from 'ava'

import { createParsable } from './createParsable';
import { parseArgv } from './parseArgv'

test('no arguments and options', t => {
  const cmd = createParsable({ name: 'a' }, { cwd: '' })
  const argv = ['a']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: [] })
})

test('throws with additional argument', t => {
  const cmd = createParsable({ name: 'a', arguments: [{ name: 'b' }] }, { cwd: '' })
  const argv = ['a', 'b', 'c']
  t.throws(() => parseArgv(cmd, argv))
})

test('throws with missing argument', t => {
  const cmd = createParsable({ name: 'a', arguments: [{ name: 'b', required: true }] }, { cwd: '' })
  const argv = ['a']
  t.throws(() => parseArgv(cmd, argv))
})

test('not throw when there are sub-commands', t => {
  const cmd = createParsable({
    name: 'a',
    commands: [createParsable({ name: 'b' }, { cwd: '' })]
  }, { cwd: '' })

  let argv = ['a', 'b']
  t.notThrows(() => parseArgv(cmd, argv))
  argv = ['a', '--verbose']
  t.notThrows(() => parseArgv(cmd, argv))
})

test('with arguments', t => {
  const cmd = createParsable({
    name: 'a',
    arguments: [{ name: 'x', required: true }]
  }, { cwd: '' })
  const argv = ['a', 'c']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: ['c'], _defaults: [] })
})

test('zero or more args should accept 0 args', t => {
  const cmd = createParsable({
    name: 'args',
    arguments: [
      {
        name: 'zero-or-more',
        multiple: true
      }
    ]
  }, { cwd: '' })
  const argv = []
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: [] })
})


test('zero or more args should accept 1 args', t => {
  const cmd = createParsable({
    name: 'args',
    arguments: [
      {
        name: 'zero-or-more',
        multiple: true
      }
    ]
  }, { cwd: '' })
  const argv = ['a', 'b']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: ['b'], _defaults: [] })
})

test('zero or more args should accept 2 args', t => {
  const cmd = createParsable({
    name: 'args',
    arguments: [
      {
        name: 'zero-or-more',
        multiple: true
      }
    ]
  }, { cwd: '' })
  const argv = ['a', 'b', 'c']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: ['b', 'c'], _defaults: [] })
})

test('one or more args should not accept 0 args', t => {
  const cmd = createParsable({
    name: 'args',
    arguments: [
      {
        name: 'one-or-more',
        multiple: true,
        required: true
      }
    ]
  }, { cwd: '' })
  const argv = ['cli']
  t.throws(() => parseArgv(cmd, argv))
})

test('one or more args should not accept 1 args', t => {
  const cmd = createParsable({
    name: 'args',
    arguments: [
      {
        name: 'one-or-more',
        multiple: true,
        required: true
      }
    ]
  }, { cwd: '' })
  const argv = ['cli', 'a']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: ['a'], _defaults: [] })
})

test('one or more args should not accept 2 args', t => {
  const cmd = createParsable({
    name: 'args',
    arguments: [
      {
        name: 'one-or-more',
        multiple: true,
        required: true
      }
    ]
  }, { cwd: '' })
  const argv = ['cli', 'a', 'b']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: ['a', 'b'], _defaults: [] })
})

