export function argv(input: string) {
  return `node ${input}`.split(' ').filter(x => x)
}
