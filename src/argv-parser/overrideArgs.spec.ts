import t from 'assert'
import { overrideArgs } from '.'

test('no default arg gets argument only', () => {
  const args = { _: ['a', 'b', 'c'], _defaults: [] }

  const actual = overrideArgs(args)
  t.deepStrictEqual(actual, { _: ['a', 'b', 'c'] })
})

test('default values remains if no config', () => {
  const args = { _: ['a', 'b', 'c'], _defaults: ['x', 'y', 'z'], x: 1, y: true, z: 'z' }

  const actual = overrideArgs(args, { x: 2, z: 'foo' })
  t.deepStrictEqual(actual, { _: ['a', 'b', 'c'], x: 2, y: true, z: 'foo' })
})

test('config override default values', () => {
  const args = { _: ['a', 'b', 'c'], _defaults: ['x', 'y', 'z'], x: 1, y: true, z: 'z' }

  const actual = overrideArgs(args, { x: 2, y: false, z: 'foo' })
  t.deepStrictEqual(actual, { _: ['a', 'b', 'c'], x: 2, y: false, z: 'foo' })
})

test('non default values overrides config values', () => {
  const args = { _: ['a', 'b', 'c'], _defaults: [], x: 1, y: true, z: 'z' }

  const actual = overrideArgs(args, { x: 2, y: false, z: 'foo' })
  t.deepStrictEqual(actual, { _: ['a', 'b', 'c'], x: 1, y: true, z: 'z' })
})

test('return value is a clone to avoid mutation by consumer', () => {
  // Prevent consumer changing one args affects the other.
  const args = { _: ['a', 'b', 'c'], _defaults: [], x: [1, 2, 3] }

  const actual = overrideArgs(args)
  t.notStrictEqual(args, actual)
  t.notStrictEqual(args._, actual._)
  t.notStrictEqual(args.x, actual.x)
})

