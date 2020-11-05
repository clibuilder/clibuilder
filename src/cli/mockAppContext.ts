import path from 'path'
import { createAppContext } from './createAppContext'

export function mockAppContext(fixtureDir: string) {
  const stack = mockStack(`${fixtureDir}/index.js`)
  return createAppContext({ stack })
}

export function mockStack(fixtureFilePath: string) {
  const p = path.resolve(process.cwd(), 'fixtures', fixtureFilePath)
  return `Error
  at Object.<anonymous> (${p}:1:13)
  at Module._compile (internal/modules/cjs/loader.js:1075:30)
  at Object.Module._extensions..js (internal/modules/cjs/loader.js:1096:10)
  at Module.load (internal/modules/cjs/loader.js:940:32)
  at Function.Module._load (internal/modules/cjs/loader.js:781:14)
  at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:72:12)
  at internal/main/run_main_module.js:17:47`
}
