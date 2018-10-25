import t from 'assert'

import { parseArgv } from './parseArgv'
import { createParsable } from './createParsable'


test(`group option should not set default if passed in`, () => {
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
      },
      number: {
        d: {
          default: 1,
          description: 'd',
          group: 'x'
        }
      }
    }
  }, { cwd: '' })

  let argv = ['cli', '-b']
  let actual = parseArgv(cmd, argv)
  t.deepStrictEqual(actual, { _: [], _defaults: [], b: true })
})

test(`group option should not set default if alias of one of the options is passed in`, () => {
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
  t.deepStrictEqual(actual, { _: [], _defaults: [], b111: true })
})
