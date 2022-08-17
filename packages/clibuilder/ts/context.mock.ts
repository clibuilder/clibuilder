import path from 'path'
import { createStandardLogForTest, StandardLogForTest } from 'standard-log'
import { loadConfig } from './config.js'
import { Context } from './context.js'
import { loadAppInfo } from './loadAppInfo.js'
import { loadPlugins } from './loadPlugins.js'
import { getFixturePath } from './test-utils/index.js'
import { createBuilderUI, createUI } from './ui.js'

export function mockContext(binFixturePath: string = process.cwd(), cwdFixturePath = process.cwd()): Context & { sl: StandardLogForTest } {
  const cwd = getFixturePath(cwdFixturePath)
  const binPath = path.join(cwd, 'node_modules', binFixturePath)
  const sl = createStandardLogForTest()
  return {
    getAppPath() { return binPath },
    loadAppInfo(appPkgPath: string) {
      return loadAppInfo(this, appPkgPath)
    },
    async loadConfig(configName: string) {
      return loadConfig({ cwd, ui: this.ui }, configName)
    },
    async loadPlugins(pluginNames: string[]) {
      return loadPlugins({ cwd, ui: this.ui }, pluginNames)
    },
    // log,
    cwd,
    exit: (function (this: any, code?: number) {
      this.ui.error(code === undefined
        // istanbul ignore next
        ? `exit`
        : `exit with ${code}`)
    }) as any,
    // cliReporter,
    createUI(id: string) { return createUI(sl.getLogger(id)) },
    ui: createBuilderUI(createUI(sl.getLogger('clibuilder'))),
    sl
  }
}
