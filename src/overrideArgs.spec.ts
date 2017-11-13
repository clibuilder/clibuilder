import { test } from 'ava'
import { overrideArgs } from './index'

test('no default arg gets argument only', t => {
  const args = { _: ['a', 'b', 'c'], _defaults: [] }

  const actual = overrideArgs(args)
  t.deepEqual(actual, { _: ['a', 'b', 'c'] })
})

test('default values remains if no config', t => {
  const args = { _: ['a', 'b', 'c'], _defaults: ['x', 'y', 'z'], x: 1, y: true, z: 'z' }

  const actual = overrideArgs(args, { x: 2, z: 'foo'})
  t.deepEqual(actual, { _: ['a', 'b', 'c'], x: 2, y: true, z: 'foo' })
})

test('config override default values', t => {
  const args = { _: ['a', 'b', 'c'], _defaults: ['x', 'y', 'z'], x: 1, y: true, z: 'z' }

  const actual = overrideArgs(args, { x: 2, y: false, z: 'foo'})
  t.deepEqual(actual, { _: ['a', 'b', 'c'], x: 2, y: false, z: 'foo' })
})

test('non default values overrides config values', t => {
  const args = { _: ['a', 'b', 'c'], _defaults: [], x: 1, y: true, z: 'z' }

  const actual = overrideArgs(args, { x: 2, y: false, z: 'foo'})
  t.deepEqual(actual, { _: ['a', 'b', 'c'], x: 1, y: true, z: 'z' })
})

test('return value is a clone to avoid mutation by consumer', t => {
  // Prevent consumer changing one args affects the other.
  const args = { _: ['a', 'b', 'c'], _defaults: [], x: [1, 2, 3] }

  const actual = overrideArgs(args)
  t.not(args, actual)
  t.not(args._, actual._)
  t.not(args.x, actual.x)
})

