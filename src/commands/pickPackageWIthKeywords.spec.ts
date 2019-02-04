import { pickPackagesWithKeywords } from './pickPackagesWithKeywords';

test('empty package info list returns empty list', () => {
  expect(pickPackagesWithKeywords([], ['x'])).toEqual([])
})

test('package info with no keywords returns empty list', () => {
  expect(pickPackagesWithKeywords([{}], ['x'])).toEqual([])
})

test('returns package name if keywords match', () => {
  expect(pickPackagesWithKeywords([{ name: 'pkg-x', keywords: ['x'] }], ['x'])).toEqual(['pkg-x'])
})

test('do not return package if not all keywords match', () => {
  expect(pickPackagesWithKeywords([{ name: 'pkg-x', keywords: ['x'] }], ['x', 'y'])).toEqual([])
})
