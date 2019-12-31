import t from 'assert'
import { toArgsWithoutDefaults } from './toArgsWithoutDefaults'

test('no default arg gets argument only', () => {
  const args = { _: ['a', 'b', 'c'], _defaults: [] }

  const actual = toArgsWithoutDefaults(args)
  t.deepStrictEqual(actual, { _: ['a', 'b', 'c'] })
})

test('all defaults arg gets argument only', () => {
  const args = { _: ['a', 'b', 'c'], _defaults: ['x', 'y', 'z'], x: 1, y: true, z: 'z' }

  const actual = toArgsWithoutDefaults(args)
  t.deepStrictEqual(actual, { _: ['a', 'b', 'c'] })
})

test('default args are removed', () => {
  const args = { _: ['a', 'b', 'c'], _defaults: ['x', 'z'], x: 1, y: true, z: 'z' }

  const actual = toArgsWithoutDefaults(args)
  t.deepStrictEqual(actual, { _: ['a', 'b', 'c'], y: true })
})

test('return value is a clone to avoid mutation by consumer', () => {
  // Prevent consumer changing one args affects the other.
  const args = { _: ['a', 'b', 'c'], _defaults: [], x: [1, 2, 3] }

  const actual = toArgsWithoutDefaults(args)
  t.notStrictEqual(args, actual)
  t.notStrictEqual(args._, actual._)
  t.notStrictEqual(args.x, actual.x)
})

