import { parseArgv } from './parseArgv'
import { createCommand } from './test/commands'

test('no arguments and options', () => {
  const cmd = createCommand({ name: 'a' })
  const argv = ['a']
  const actual = parseArgv(cmd, argv)
  expect(actual).toEqual({ _: [] })
})

test('throws with additional argument', () => {
  const cmd = createCommand({ name: 'a', arguments: [{ name: 'b' }] })
  const argv = ['a', 'b', 'c']
  expect(() => parseArgv(cmd, argv)).toThrow()
})

test('throws with missing argument', () => {
  const cmd = createCommand({ name: 'a', arguments: [{ name: 'b', required: true }] })
  const argv = ['a']
  expect(() => parseArgv(cmd, argv)).toThrow()
})

test('not throw when there are sub-commands', () => {
  const cmd = createCommand({
    name: 'a',
    commands: [createCommand({ name: 'b' })]
  })

  let argv = ['a', 'b']
  expect(() => parseArgv(cmd, argv)).not.toThrow()
  argv = ['a', '--verbose']
  expect(() => parseArgv(cmd, argv)).not.toThrow()
})

test('with arguments', () => {
  const cmd = createCommand({
    name: 'a',
    arguments: [{ name: 'x', required: true }]
  })
  const argv = ['a', 'c']
  const actual = parseArgv(cmd, argv)
  expect(actual).toEqual({ _: ['c'] })
})

test('throw with unknown options', () => {
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
  })
  const argv = ['a', '--something']
  expect(() => parseArgv(cmd, argv)).toThrow()
})

test('with boolean options', () => {
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
  })

  let argv = ['a', '--verbose']
  let actual = parseArgv(cmd, argv)
  const expected = { _: [], 'verbose': true, 'V': true }

  expect(actual).toEqual(expected)

  argv = ['a', '-V']
  actual = parseArgv(cmd, argv)
  expect(actual).toEqual(expected)
})
