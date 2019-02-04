import t from 'assert';
import { hasAllKeywords } from './hasAllKeywords';

test('undefined list should be false', () => {
  t.strictEqual(hasAllKeywords(undefined, ['x']), false)
})

test('empty list should be false', () => {
  t.strictEqual(hasAllKeywords([], ['x']), false)
})

test('not matching list should be false', () => {
  t.strictEqual(hasAllKeywords(['y'], ['x']), false)
})

test('matching list should be true', () => {
  t.strictEqual(hasAllKeywords(['x'], ['x']), true)
})

test('matching with extra keywords should be true', () => {
  t.strictEqual(hasAllKeywords(['x', 'y'], ['x']), true)
})

test('matching with extra keywords should be true', () => {
  t.strictEqual(hasAllKeywords(['x', 'x'], ['x']), true)
})

test('not matching all keywords should be false', () => {
  t.strictEqual(hasAllKeywords(['x'], ['x', 'y']), false)
})
