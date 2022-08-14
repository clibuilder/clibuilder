import findUp from 'find-up'
import { readFileSync } from 'fs'
import { dirname } from 'path'
import { createUI } from './ui.js'

export function loadAppInfo(ui: Pick<createUI.UI, 'debug'>, appPkgPath: string) {
  ui.debug(`finding package.json starting from '${appPkgPath}'...`)
  const pjsonPath = findUp.sync('package.json', { cwd: appPkgPath })
  // istanbul ignore next
  if (pjsonPath) {
    ui.debug(`found package.json at '${pjsonPath}'`)

    const pjson = JSON.parse(readFileSync(pjsonPath, 'utf-8'))
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
