import { createStandardLogForTest, Logger, logLevels, MemoryLogReporter } from 'standard-log'
import { AnyFunction } from 'type-plus'
import { Context, context } from '../context.js'
import { getAppPath } from '../getAppPath.js'
import { createUI } from '../ui.js'
import { getFixturePath } from './index.js'

export type MockAppContext = Context & {
  reporter: MemoryLogReporter
}

export function testCommandContext(config: Record<string, any> = {}): MockAppContext {
  return compose(
    context,
    mockUI,
    ctx => mockProcess(ctx, process.cwd()),
    ctx => mockConfig(ctx, config)
  )
}

export function mockContext(binFixturePath: string, cwdFixturePath = process.cwd()): MockAppContext {
  const cwd = getFixturePath(cwdFixturePath)
  const binPath = getFixturePath(binFixturePath)
  return compose(
    context,
    mockUI,
    ctx => mockProcess(ctx, cwd),
    ctx => mockGetAppPath(ctx, binPath)
  )
}

export function mockUI(context: Context) {
  const sl = createStandardLogForTest(logLevels.all)

  context.createUI = (log: Logger) => createUI(sl.getLogger(log.id, { level: log.level, writeTo: sl.reporter }))
  // const ui = createBuilderUI(createUI(getLogger('clibuilder', { level: logLevels.all, writeTo: reporter })))
  return { ...context, reporter: sl.reporter }
}

function mockProcess(context: Context, cwd: string) {
  context.process = {
    ...process,
    cwd: () => cwd,
    exit: ((code?: number) => context.ui.error(code === undefined
      // istanbul ignore next
      ? `exit`
      : `exit with ${code}`)) as any
  }
  return context
}

function mockGetAppPath(context: Context, binPath: string) {
  const stack = mockStack(binPath)
  context.getAppPath = () => getAppPath(stack)
  return context
}

function mockStack(path: string) {
  return `Error
  at Object.<anonymous> (${path}:1:13)
  at Module._compile (internal/modules/cjs/loader.js:1075:30)
  at Object.Module._extensions..js (internal/modules/cjs/loader.js:1096:10)
  at Module.load (internal/modules/cjs/loader.js:940:32)
  at Function.Module._load (internal/modules/cjs/loader.js:781:14)
  at Function.executeUserEntryPoint [as runMain] (internal/modules/run_main.js:72:12)
  at internal/main/run_main_module.js:17:47`
}

function mockConfig(context: Context, config: any) {
  context.loadConfig = () => config
  return context
}

function compose(first: AnyFunction, ...steps: AnyFunction[]) {
  return steps.reduce((p, s) => s(p), first())
}
