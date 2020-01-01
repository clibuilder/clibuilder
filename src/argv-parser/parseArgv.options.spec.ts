import t from 'assert'
import { NotNumberOption } from '..'
import { createParsable } from './createParsable'
import { parseArgv } from './parseArgv'

const verboseWithAlias = {
  name: 'cmd',
  options: {
    boolean: {
      verbose: {
        description: 'Turn on verbose',
        alias: ['V'],
      },
    },
  },
  run() { return },
}

test('specifed boolean option will be set without alias', () => {
  const cmd = createParsable(verboseWithAlias, {})

  let argv = ['cmd', '--verbose']
  let actual = parseArgv(cmd, argv)

  t.deepStrictEqual(actual, { _: [], _defaults: [], 'verbose': true })

  argv = ['a', '-V']
  actual = parseArgv(cmd, argv)
  t.deepStrictEqual(actual, { _: [], _defaults: [], 'verbose': true })
})

test('fill default for boolean option', () => {
  const cmd = createParsable({
    name: 'a',
    options: {
      boolean: {
        x: {
          description: 'xx',
          default: true,
        },
      },
    },
    run() { return },
  }, {})
  const argv = ['a']
  const actual = parseArgv(cmd, argv)
  t.deepStrictEqual(actual, { _: [], _defaults: ['x'], x: true })
})

test('fill default for string option', () => {
  const cmd = createParsable({
    name: 'a',
    options: {
      string: {
        x: {
          description: 'xx',
          default: 'abc',
        },
      },
    },
    run() { return },
  }, {})
  const argv = ['a']
  const actual = parseArgv(cmd, argv)
  t.deepStrictEqual(actual, { _: [], _defaults: ['x'], x: 'abc' })
})

test('fill default for number option', () => {
  const cmd = createParsable({
    name: 'a',
    options: {
      number: {
        x: {
          description: 'xx',
          default: 1,
        },
      },
    },
    run() { return },
  }, {})
  const argv = ['a']
  const actual = parseArgv(cmd, argv)
  t.deepStrictEqual(actual, { _: [], _defaults: ['x'], x: 1 })
})

test('options with wrong type will throws', () => {
  const cmd = createParsable({
    name: 'a',
    options: {
      string: {
        stringOption: {
          description: 'string',
        },
      },
      number: {
        numberOption: {
          description: 'number',
        },
      },
    },
    run() { return },
  }, {})
  t.throws(() => parseArgv(cmd, ['a', '--numberOption=true']), NotNumberOption)
})
