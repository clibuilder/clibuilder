import { dirname } from 'path'
import { findPackageJson, getPackageJson } from './platform.js'
import { createUI } from './ui.js'

export const ctx = {
  findPackageJson,
  getPackageJson
}

/**
 * Load the CLI app info.
 */
export function loadAppInfo({ ui }: { ui: Pick<createUI.UI, 'debug'> }, appPkgPath: string) {
  ui.debug(`finding package.json starting from '${appPkgPath}'...`)
  const pjsonPath = ctx.findPackageJson(appPkgPath)
  // istanbul ignore next
  if (pjsonPath) {
    ui.debug(`found package.json at '${pjsonPath}'`)

    const pjson = ctx.getPackageJson(pjsonPath)
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
