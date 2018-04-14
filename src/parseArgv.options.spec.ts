import t from 'assert'

import { createParsable } from './createParsable'
import { parseArgv, NotNumberOption } from './parseArgv'

test('throw with unknown options', () => {
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
  }, {})
  const argv = ['a', '--something']
  t.throws(() => parseArgv(cmd, argv))
})

const verboseWithAlias = {
  name: 'cmd',
  options: {
    boolean: {
      verbose: {
        description: 'Turn on verbose',
        alias: ['V']
      }
    }
  }
}

test('specifed boolean option will be set without alias', () => {
  const cmd = createParsable(verboseWithAlias, {})

  let argv = ['cmd', '--verbose']
  let actual = parseArgv(cmd, argv)

  t.deepEqual(actual, { _: [], _defaults: [], 'verbose': true })

  argv = ['a', '-V']
  actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: [], 'verbose': true })
})

test('fill default for boolean option', () => {
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
  }, {})
  const argv = ['a']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: ['x'], x: true })
})

test('fill default for string option', () => {
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
  }, {})
  const argv = ['a']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: ['x'], x: 'abc' })
})

test('fill default for number option', () => {
  const cmd = createParsable({
    name: 'a',
    options: {
      number: {
        x: {
          description: 'xx',
          default: 1
        }
      }
    }
  }, {})
  const argv = ['a']
  const actual = parseArgv(cmd, argv)
  t.deepEqual(actual, { _: [], _defaults: ['x'], x: 1 })
})

test('options with wrong type will throws', () => {
  const cmd = createParsable({
    name: 'a',
    options: {
      string: {
        stringOption: {
          description: 'string'
        }
      },
      number: {
        numberOption: {
          description: 'number'
        }
      }
    }
  }, {})
  t.throws(() => parseArgv(cmd, ['a', '--numberOption=true']), NotNumberOption)
})
