import findUp from 'find-up'

export function loadAppInfo(cwd: string) {
  const pjsonPath = findUp.sync('package.json', { cwd })!
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pjson = require(pjsonPath)
  return {
    name: pjson.name || '',
    version: pjson.version || '',
    bin: pjson.bin || ''
  } as AppInfo
}

export type AppInfo = {
  name: string,
  version: string,
  bin: string | Record<string, string> | undefined
}
