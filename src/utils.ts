/**
 * Pad `str` to `width`.
 */
export function pad(str: string, width: number) {
  const len = Math.max(0, width - str.length)
  return str + Array(len + 1).join(' ')
}
