import { readFileSync } from 'node:fs'
import { findFileUp } from './find_up.js'

export function findPackageJson(appPkgPath: string) {
	return findFileUp(appPkgPath, 'package.json')
}

export function getPackageJson(pjsonPath: string) {
	return JSON.parse(readFileSync(pjsonPath, 'utf-8'))
}
