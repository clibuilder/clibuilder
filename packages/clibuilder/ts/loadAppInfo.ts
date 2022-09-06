import fs from 'fs'
import { findUpSync } from 'find-up'
import { dirname } from 'path'
import { createUI } from './ui.js'

export function loadAppInfo(ui: createUI.UI, appPkgPath: string) {
  ui.debug(`finding package.json starting from '${appPkgPath}'...`)
  const pjsonPath = findUpSync('package.json', { cwd: appPkgPath })
  // istanbul ignore next
  if (pjsonPath) {
    ui.debug(`found package.json at '${pjsonPath}'`)

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pjson = JSON.parse(fs.readFileSync(pjsonPath, 'utf-8'))
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
