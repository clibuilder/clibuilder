import { readFileSync } from 'node:fs'
import { findUpSync } from 'find-up'

export const ctx = {
	pjson: undefined,
	platform: process.platform
}

export function findPackageJson(appPkgPath: string) {
	return findUpSync('package.json', { cwd: appPkgPath })
}

export function getPackageJson(pjsonPath: string) {
	return JSON.parse(readFileSync(pjsonPath, 'utf-8'))
}
