import findUp from 'find-up'
import { dirname } from 'path'

export function loadAppInfo(appPkgPath: string) {
  const pjsonPath = findUp.sync('package.json', { cwd: appPkgPath })!
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pjson = require(pjsonPath)
  return {
    name: pjson.name,
    version: pjson.version,
    description: pjson.description,
    bin: pjson.bin,
    dir: dirname(pjsonPath)
  } as AppInfo
}

export type AppInfo = {
  name: string | undefined,
  version: string | undefined,
  description: string | undefined,
  bin: string | Record<string, string> | undefined,
  dir: string
}
