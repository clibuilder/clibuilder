import { createStandardLogForTest, LogLevel, StandardLogForTest } from 'standard-log'
import { loadConfig } from './config.js'
import { Context } from './context.js'
import { loadPlugins } from './loadPlugins.js'
import { getFixturePath } from './test-utils/index.js'
import { createBuilderUI, createUI } from './ui.js'
import tmp from 'tmp'

export function mockContext(params?: { fixtureDir?: string, logLevel?: LogLevel }): Context & { sl: StandardLogForTest } {
  const { fixtureDir, logLevel } = params ?? {}
  const cwd = fixtureDir ? getFixturePath(fixtureDir) : tmp.dirSync().name
  const sl = createStandardLogForTest(logLevel)
  return {
    async loadConfig(configName: string) {
      return loadConfig({ cwd, ui: this.ui }, configName)
    },
    async loadPlugins(pluginNames: string[]) {
      return loadPlugins({ cwd, ui: this.ui }, pluginNames)
    },
    cwd,
    exit: (function (this: any, code?: number) {
      this.ui.error(code === undefined
        // istanbul ignore next
        ? `exit`
        : `exit with ${code}`)
    }) as any,
    createUI(id: string) { return createUI(sl.getLogger(id)) },
    ui: createBuilderUI(createUI(sl.getLogger('clibuilder'))),
    sl
  }
}
