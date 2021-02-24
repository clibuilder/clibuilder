import findUp from 'find-up'
import { dirname } from 'path'
import { Logger } from 'standard-log'

export function loadAppInfo(log: Logger, appPkgPath: string) {
  log.debug(`finding package.json starting from '${appPkgPath}'...`)
  const pjsonPath = findUp.sync('package.json', { cwd: appPkgPath })
  if (pjsonPath) {
    log.debug(`found package.json at '${pjsonPath}'`)

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
}

export type AppInfo = {
  name: string | undefined,
  version: string | undefined,
  description: string | undefined,
  bin: string | Record<string, string> | undefined,
  dir: string
}
