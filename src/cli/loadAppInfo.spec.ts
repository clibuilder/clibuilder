import a from 'assertron'
import { getFixturePath } from '../test-utils'
import { loadAppInfo } from './loadAppInfo'

test('no package.json', () => {
  const appInfo = loadAppInfo([], getFixturePath('no-pjson/index.js'))

  // `findUp` will find `package.json` at root.
  a.satisfies(appInfo, { name: 'clibuilder' })
})

test('no bin', () => {
  const appInfo = loadAppInfo([], getFixturePath('no-bin/index.js'))
  a.satisfies(appInfo, {
    name: 'no-bin',
    version: '1.0.0'
  })
})

test('string bin', () => {
  const appInfo = loadAppInfo([], getFixturePath('string-bin/bin.js'))
  a.satisfies(appInfo, {
    name: 'string-bin',
    version: '1.0.0',
    bin: 'bin.js'
  })
})

test('single bin', () => {
  const appInfo = loadAppInfo([], getFixturePath('single-bin/bin.js'))
  a.satisfies(appInfo, {
    name: 'single-bin',
    version: '1.2.3',
    bin: { 'single-cli': 'bin.js' }
  })
})

test('multi bin', () => {
  const appInfo = loadAppInfo([], getFixturePath('multi-bin/bin-b.js'))

  a.satisfies(appInfo, {
    name: 'multi-bin',
    version: '1.0.0',
    bin: { 'cli-a': 'bin-a.js', 'cli-b': 'bin-b.js' }
  })
})
