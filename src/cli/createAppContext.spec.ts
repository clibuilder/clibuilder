import a from 'assertron'
import { createAppContext } from './createAppContext'
import { mockStack } from './mockAppContext'

describe('loadAppInfo()', () => {
  test('no bin', () => {
    const stack = mockStack('no-bin/index.js')
    const c = createAppContext({ stack })
    const appinfo = c.loadAppInfo()
    a.satisfies(appinfo, {
      name: 'no-bin',
      version: '1.0.0',
      bin: undefined,
      appPath: /index.js/
    })

  })

  test.only('string bin', () => {
    const stack = mockStack('string-bin/bin.js')
    const c = createAppContext({ stack })
    const appinfo = c.loadAppInfo()
    a.satisfies(appinfo, {
      name: 'string-bin',
      version: '1.0.0',
      bin: 'bin.js',
      appPath: /bin.js/
    })
  })

  test('single bin', () => {
    const stack = mockStack('single-bin/bin.js')
    const c = createAppContext({ stack })
    const appinfo = c.loadAppInfo()
    a.satisfies(appinfo, {
      name: 'single-bin',
      version: '1.0.0',
      bin: { 'single-cli': 'bin.js' },
      appPath: /bin.js/
    })
  })

  test('multi bin', () => {
    const stack = mockStack('multi-bin/binb.js')
    const c = createAppContext({ stack })
    const appinfo = c.loadAppInfo()

    a.satisfies(appinfo, {
      name: 'multi-bin',
      version: '1.0.0',
      bin: { 'clia': 'bina.js', 'clib': 'binb.js' },
      appPath: /binb.js/
    })
  })
})

describe('createUI()', () => {

})
