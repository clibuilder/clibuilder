import { config, createMemoryLogReporter, getLogger, Logger, logLevels, MemoryLogReporter } from 'standard-log'
import { AnyFunction } from 'type-plus'
import { Context, context } from '../context'
import { getAppPath } from '../getAppPath'
import { getFixturePath } from '.'
import { ui } from '../ui'

export type MockAppContext = Context & {
  reporter: MemoryLogReporter
}

export function mockContext(binFixturePath: string, cwdFixturePath = process.cwd()): MockAppContext {
  return compose(
    context,
    mockUI,
    ctx => mockProcess(ctx, cwdFixturePath),
    ctx => mockGetAppPath(ctx, binFixturePath)
  )
}

export function mockUI(context: Context) {
  const reporter = createMemoryLogReporter({ id: 'mock-reporter' })
  config({
    logLevel: logLevels.all,
    reporters: [reporter],
    mode: 'test'
  })
  context.ui = (log: Logger) => ui(getLogger(log.id, { level: log.level, writeTo: 'mock-reporter' }))
  return { ...context, reporter }
}

export function mockProcess(context: Context, cwdFixturePath: string) {
  const cwd = getFixturePath(cwdFixturePath)
  context.process = {
    ...process,
    cwd: () => cwd,
    exit: ((code?: number) => {
      context.log.error(code === undefined ? `exit` : `exit with ${code}`)
    }) as any
  }
  return context
}

export function mockGetAppPath(context: Context, fixtureFilePath: string) {
  const stack = mockStack(fixtureFilePath)
  context.getAppPath = () => getAppPath(stack)
  return context
}

export function mockStack(fixtureFilePath: string) {
  const p = getFixturePath(fixtureFilePath)
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
