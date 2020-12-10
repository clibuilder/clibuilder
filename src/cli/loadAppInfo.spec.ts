import a from 'assertron'
import { getFixturePath } from '../test-utils'
import { loadAppInfo } from './loadAppInfo'

test('no bin', () => {
  const appInfo = loadAppInfo(getFixturePath('no-bin/index.js'))
  a.satisfies(appInfo, {
    name: 'no-bin',
    version: '1.0.0',
    bin: ''
  })
})

test('string bin', () => {
  const appInfo = loadAppInfo(getFixturePath('string-bin/bin.js'))
  a.satisfies(appInfo, {
    name: 'string-bin',
    version: '1.0.0',
    bin: 'bin.js'
  })
})

test('single bin', () => {
  const appInfo = loadAppInfo(getFixturePath('single-bin/bin.js'))
  a.satisfies(appInfo, {
    name: 'single-bin',
    version: '1.0.0',
    bin: { 'single-cli': 'bin.js' }
  })
})

test('multi bin', () => {
  const appInfo = loadAppInfo(getFixturePath('multi-bin/bin-b.js'))

  a.satisfies(appInfo, {
    name: 'multi-bin',
    version: '1.0.0',
    bin: { 'cli-a': 'bin-a.js', 'cli-b': 'bin-b.js' }
  })
})
