import findUp from 'find-up'
import { dirname } from 'path'
import { createUI } from './ui'

export function loadAppInfo(ui: createUI.UI, appPkgPath: string) {
  ui.debug(`finding package.json starting from '${appPkgPath}'...`)
  const pjsonPath = findUp.sync('package.json', { cwd: appPkgPath })
  // istanbul ignore next
  if (pjsonPath) {
    ui.debug(`found package.json at '${pjsonPath}'`)

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
