export function hasAllKeywords(actual: string[] | undefined, expected: string[]) {
  const set = new Set(actual)
  return !expected.find(key => !set.has(key))
}
