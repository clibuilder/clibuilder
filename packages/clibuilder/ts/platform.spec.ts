import path from 'path'
import { ctx, findPackageJson, getHomePath, getPackageJson } from './platform.js'
import { pathEqual } from 'path-equal'
import { getFixturePath } from './test-utils/getFixturePath.js'
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

describe('getHomePath()', () => {
	it('getS USERPROFILE for Windows', () => {
		ctx.platform = 'win32'
		ctx.USERPROFILE = 'C:/Users/miku'
		expect(getHomePath()).toEqual('C:/Users/miku')
	})
	it('gets HOME for Non Windows', () => {
		ctx.platform = 'linux'
		ctx.HOME = '/usr/miku'
		expect(getHomePath()).toEqual('/usr/miku')
	})
})
