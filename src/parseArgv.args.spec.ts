import t from 'assert'
import a from 'assertron'

import { createParsable } from './createParsable'
import { parseArgv } from './parseArgv'

test('no arguments and options', () => {
  const cmd = createParsable({ name: 'a' })
  const argv = ['a']
  const actual = parseArgv(cmd, argv)
  t.deepStrictEqual(actual, { _: [], _defaults: [] })
})

test('throws with additional argument', () => {
  const cmd = createParsable({ name: 'a' })
  const argv = ['a', 'extra']
  t.throws(() => parseArgv(cmd, argv))
})

test('throws with more argument than expected', () => {
  const cmd = createParsable({ name: 'a', arguments: [{ name: 'b' }] })
  const argv = ['a', 'b', 'c']
  t.throws(() => parseArgv(cmd, argv))
})

test('throws with missing argument', () => {
  const cmd = createParsable({ name: 'a', arguments: [{ name: 'b', required: true }] })
  const argv = ['a']
  t.throws(() => parseArgv(cmd, argv))
})

test('not throw when there are sub-commands', () => {
  const cmd = createParsable({
    name: 'a',
    commands: [createParsable({ name: 'b' })]
  })

  let argv = ['a', 'b']
  parseArgv(cmd, argv)
  argv = ['a', '--verbose']
  parseArgv(cmd, argv)
})

test('with arguments', () => {
  const cmd = createParsable({
    name: 'a',
    arguments: [{ name: 'x', required: true }]
  })
  const argv = ['a', 'c']
  const actual = parseArgv(cmd, argv)
  t.deepStrictEqual(actual, { _: [], _defaults: [], x: 'c' })
})

test('zero or more args should accept 0 args', () => {
  const cmd = createParsable({
    name: 'args',
    arguments: [
      {
        name: 'zero-or-more',
        multiple: true
      }
    ]
  })
  const argv: string[] = []
  const actual = parseArgv(cmd, argv)
  t.deepStrictEqual(actual, { _: [], _defaults: [] })
})


test('zero or more args should accept 1 args', () => {
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
  a.satisfies(actual, { 'zero-or-more': ['b'], zeroOrMore: ['b'] })
})

test('zero or more args should accept 2 args', () => {
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
  a.satisfies(actual, { 'zero-or-more': ['b', 'c'], zeroOrMore: ['b', 'c'] })
})

test('one or more args should not accept 0 args', () => {
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

test('one or more args should not accept 1 args', () => {
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
  a.satisfies(actual, { 'one-or-more': ['a'] })
})

test('one or more args should not accept 2 args', () => {
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

  a.satisfies(actual, { 'one-or-more': ['a', 'b'], oneOrMore: ['a', 'b'] })
})
