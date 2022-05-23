import a from 'assertron'
import { getLogger } from 'standard-log'
import { stub } from 'type-plus'
import { loadAppInfo } from './loadAppInfo.js'
import { getFixturePath } from './test-utils/index.js'
import { createUI } from './ui.js'

function testLoadAppInfo(fixturePath: string) {
  const log = getLogger('test-loadAppInfo')
  return loadAppInfo(stub<createUI.UI>(log), getFixturePath(fixturePath))
}

test('no package.json', () => {
  const appInfo = testLoadAppInfo('no-pjson/index.js')

  // `findUp` will find `package.json` at root.
  a.satisfies(appInfo, { name: 'clibuilder' })
})

test('no bin', () => {
  const appInfo = testLoadAppInfo('no-bin/index.js')
  a.satisfies(appInfo, {
    name: 'no-bin',
    version: '1.0.0'
  })
})

test('string bin', () => {
  const appInfo = testLoadAppInfo('string-bin/bin.js')
  a.satisfies(appInfo, {
    name: 'string-bin',
    version: '1.0.0',
    bin: 'bin.js'
  })
})

test('single bin', () => {
  const appInfo = testLoadAppInfo('single-bin/bin.js')
  a.satisfies(appInfo, {
    name: 'single-bin',
    version: '1.2.3',
    bin: { 'single-cli': 'bin.js' }
  })
})

test('multi bin', () => {
  const appInfo = testLoadAppInfo('multi-bin/bin-b.js')

  a.satisfies(appInfo, {
    name: 'multi-bin',
    version: '1.0.0',
    bin: { 'cli-a': 'bin-a.js', 'cli-b': 'bin-b.js' }
  })
})
