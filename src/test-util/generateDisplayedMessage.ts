export function generateDisplayedMessage(entries: string[][]) {
  return entries.map(e => e.join(' ')).join('\n')
}
