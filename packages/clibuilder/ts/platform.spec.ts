import path from 'path'
import { pathEqual } from 'path-equal'
import { findPackageJson, getPackageJson } from './platform.js'
import { getFixturePath } from './test-utils/fixture.js'
describe('findPackageJson()', () => {
	it('looks up to get the nearest package.json', () => {
		const a = findPackageJson(path.resolve('.'))!
		expect(pathEqual(a, path.resolve('./package.json'))).toBeTruthy()
	})
})

describe('getPackageJson()', () => {
	it('reads package.json', () => {
		const jsonPath = findPackageJson(getFixturePath('cli-with-one-plugin'))!
		const pjson = getPackageJson(jsonPath)
		expect(pjson.type).toEqual('commonjs')
	})
})
