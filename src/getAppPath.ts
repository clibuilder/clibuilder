import fs from 'fs'

export function getAppPath(stack: string) {
  const callPaths = extractCallPaths(stack)
  return callPaths.reverse().find(p => fs.existsSync(p))!
}

function extractCallPaths(stack: string) {
  return stack.split('\n')
    .map(l => l.split(' ').pop())
    .map(l => l?.startsWith('(') ? l.slice(1, -1) : l)
    .map(l => l?.split(/:\d+:\d+/).shift())
    .filter(l => l && l !== '<anonymous>') as string[]
}
