import test from 'ava'

import { createParsable } from './createParsable';
import { parseArgv } from './parseArgv'
import { booleanOptionsCommand } from './test-util/index';

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

test('throw with unknown options', t => {
  const cmd = createParsable({
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
  const cmd = createParsable({
    name: 'a',
    options: {
      boolean: {
        verbose: {
          description: 'Turn on verbose',
          alias: ['V']
        }
      }
    }
  }, { cwd: '' })

  let argv = ['a', '--verbose']
  let actual = parseArgv(cmd, argv)

  t.deepEqual(actual, { _: [], 'verbose': true, 'V': true, _defaults: [] })

  argv = ['a', '-V']
  actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: [], 'verbose': true, 'V': true })
})

test('fill default for boolean option', t => {
  const cmd = createParsable({
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
  t.deepEqual(actual, { _: [], _defaults: ['x'], x: true })
})

test('fill default for string option', t => {
  const cmd = createParsable({
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
  t.deepEqual(actual, { _: [], _defaults: ['x'], x: 'abc' })
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

test(`group option should not set default if passed in`, t => {
  const cmd = createParsable({
    name: 'opts',
    options: {
      boolean: {
        a: {
          description: 'a',
          default: true,
          group: 'x'
        },
        b: {
          description: 'b',
          group: 'x'
        }
      },
      string: {
        c: {
          default: 'c',
          description: 'c',
          group: 'x'
        }
      }
    }
  }, { cwd: '' })
  const argv = ['cli', '-b']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: [], b: true })
})

test(`group option should not set default if alias of one of the options is passed in`, t => {
  const cmd = createParsable({
    name: 'opts',
    options: {
      boolean: {
        a111: {
          description: 'a',
          default: true,
          group: 'x'
        },
        b111: {
          alias: ['b'],
          description: 'b',
          group: 'x'
        }
      },
      string: {
        c111: {
          default: 'c',
          description: 'c',
          group: 'x'
        }
      }
    }
  }, { cwd: '' })
  const argv = ['cli', '-b']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: [], b: true, b111: true })
})

test('boolean option without default should not be set by default', t => {
  const cmd = createParsable(booleanOptionsCommand, {})
  const argv = ['cmd']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: ['a'], a: true })
})
