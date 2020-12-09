import a from 'assertron'
import { loadAppInfo } from './loadAppInfo'
import { mockStack } from './mockAppContext'

test('no bin', () => {
  const appInfo = loadAppInfo(mockStack('no-bin/index.js'))
  a.satisfies(appInfo, {
    name: 'no-bin',
    version: '1.0.0',
    bin: '',
    appPath: /index.js/
  })

})

test('string bin', () => {
  const appInfo = loadAppInfo(mockStack('string-bin/bin.js'))
  a.satisfies(appInfo, {
    name: 'string-bin',
    version: '1.0.0',
    bin: 'bin.js',
    appPath: /bin.js/
  })
})

test('single bin', () => {
  const appInfo = loadAppInfo(mockStack('single-bin/bin.js'))
  a.satisfies(appInfo, {
    name: 'single-bin',
    version: '1.0.0',
    bin: { 'single-cli': 'bin.js' },
    appPath: /bin.js/
  })
})

test('multi bin', () => {
  const appInfo = loadAppInfo(mockStack('multi-bin/bin-b.js'))

  a.satisfies(appInfo, {
    name: 'multi-bin',
    version: '1.0.0',
    bin: { 'cli-a': 'bin-a.js', 'cli-b': 'bin-b.js' },
    appPath: /bin-b.js/
  })
})
