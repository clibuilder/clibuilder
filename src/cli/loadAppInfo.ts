import findUp from 'find-up'
import fs from 'fs'

export function loadAppInfo(stack: string) {
  const callPaths = extractCallPaths(stack)
  const appPath = getAppPath(callPaths)
  const pjsonPath = findUp.sync('package.json', { cwd: appPath })!
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pjson = require(pjsonPath)
  return {
    name: pjson.name || '',
    version: pjson.version || '',
    bin: pjson.bin || '',
    appPath
  } as AppInfo
}

export type AppInfo = {
  name: string,
  version: string,
  bin: string | Record<string, string> | undefined,
  appPath: string
}

function extractCallPaths(stack: string) {
  return stack.split('\n')
    .map(l => l.split(' ').pop())
    .map(l => l?.startsWith('(') ? l.slice(1, -1) : l)
    .map(l => l?.split(/:\d+:\d+/).shift())
    .filter(l => l && l !== '<anonymous>') as string[]
}

function getAppPath(callPaths: string[]) {
  return callPaths.reverse().find(p => fs.existsSync(p))!
}
// Error
//     at Object.<anonymous> (D:\code\unional\node_modules\@unional\globalify\index.js:3:15)
//     at Module._compile (internal/modules/cjs/loader.js:1075:30)
//     at Object.Module._extensions..js (internal/modules/cjs/loader.js:1096:10)
//     at Module.load (internal/modules/cjs/loader.js:940:32)
//     at Function.Module._load (internal/modules/cjs/loader.js:781:14)
//     at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:72:12)
//     at internal/main/run_main_module.js:17:47
