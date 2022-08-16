import findUp from 'find-up'
import { readFileSync } from 'fs'

export const ctx = {
  pjson: undefined,
  platform: process.platform,
  USERPROFILE: process.env.USERPROFILE,
  HOME: process.env.HOME
}

export function getHomePath() {
  const win = ctx.platform === 'win32'
  return (win ? ctx.USERPROFILE : ctx.HOME) as string
}

export function findPackageJson(appPkgPath: string) {
  return findUp.sync('package.json', { cwd: appPkgPath })
}

export function getPackageJson(pjsonPath: string) {
  if (ctx.pjson) return ctx.pjson
  return ctx.pjson = JSON.parse(readFileSync(pjsonPath, 'utf-8'))
}
