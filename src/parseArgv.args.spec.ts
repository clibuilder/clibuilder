import test from 'ava'

import { createParsable } from './createParsable';
import { parseArgv } from './parseArgv'

test('no arguments and options', t => {
  const cmd = createParsable({ name: 'a' })
  const argv = ['a']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: [] })
})

test('throws with additional argument', t => {
  const cmd = createParsable({ name: 'a', arguments: [{ name: 'b' }] })
  const argv = ['a', 'b', 'c']
  t.throws(() => parseArgv(cmd, argv))
})

test('throws with missing argument', t => {
  const cmd = createParsable({ name: 'a', arguments: [{ name: 'b', required: true }] })
  const argv = ['a']
  t.throws(() => parseArgv(cmd, argv))
})

test('not throw when there are sub-commands', t => {
  const cmd = createParsable({
    name: 'a',
    commands: [createParsable({ name: 'b' })]
  })

  let argv = ['a', 'b']
  t.notThrows(() => parseArgv(cmd, argv))
  argv = ['a', '--verbose']
  t.notThrows(() => parseArgv(cmd, argv))
})

test('with arguments', t => {
  const cmd = createParsable({
    name: 'a',
    arguments: [{ name: 'x', required: true }]
  })
  const argv = ['a', 'c']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: [], x: 'c' })
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
  })
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
  })
  const argv = ['a', 'b']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: [], 'zero-or-more': ['b'] })
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
  })
  const argv = ['a', 'b', 'c']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: [], 'zero-or-more': ['b', 'c'] })
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
  })
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
  })
  const argv = ['args', 'a']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: [], 'one-or-more': ['a'] })
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
  })
  const argv = ['cli', 'a', 'b']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: [], 'one-or-more': ['a', 'b'] })
})
