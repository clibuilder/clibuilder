import path from 'path'
import { config, createMemoryLogReporter, getLogger, logLevels } from 'standard-log'
import { AnyFunction } from 'type-plus'
import { AppContext, createAppContext } from './createAppContext'
import { loadAppInfo } from './loadAppInfo'

export function mockAppContext(fixtureFilePath: string) {
  return compose(
    createAppContext,
    mockUI,
    mockProcess,
    (ctx: AppContext) => mockLoadAppInfo(ctx, fixtureFilePath)
  )
}

export function mockUI(context: AppContext): AppContext {
  const reporter = createMemoryLogReporter({ id: 'mock-reporter' })
  config({
    logLevel: logLevels.all,
    reporters: [reporter],
    mode: 'test'
  })
  const log = getLogger('mock-ui', { level: logLevels.all, writeTo: 'mock-reporter' })
  context.ui = log
  return context
}

export function mockProcess(context: AppContext) {
  context.process = {
    ...process,
    exit: ((code?: number) => {
      context.ui.error(code === undefined ? `exit` : `exit with ${code}`)
    }) as any
  }
  return context
}

export function mockLoadAppInfo(context: AppContext, fixtureFilePath: string) {
  const stack = mockStack(fixtureFilePath)
  context.loadAppInfo = () => loadAppInfo(stack)
  return context
}

export function mockStack(fixtureFilePath: string) {
  const p = path.resolve(process.cwd(), 'fixtures', fixtureFilePath)
  return `Error
  at Object.<anonymous> (${p}:1:13)
  at Module._compile (internal/modules/cjs/loader.js:1075:30)
  at Object.Module._extensions..js (internal/modules/cjs/loader.js:1096:10)
  at Module.load (internal/modules/cjs/loader.js:940:32)
  at Function.Module._load (internal/modules/cjs/loader.js:781:14)
  at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:72:12)
  at internal/main/run_main_module.js:17:47`
}

function compose(first: AnyFunction, ...steps: AnyFunction[]) {
  return steps.reduce((p, s) => s(p), first())
}
