import path from 'path'
import { ctx, findPackageJson, getHomePath, getPackageJson } from './platform.js'

describe('getPackageJson()', () => {
  it('caches pjson', () => {
    const jsonPath = findPackageJson(path.resolve('.'))!
    const pjson = getPackageJson(jsonPath)
    expect(getPackageJson(jsonPath)).toBe(pjson)
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
