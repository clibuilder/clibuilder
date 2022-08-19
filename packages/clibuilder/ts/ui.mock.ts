import { createStandardLogForTest, LogLevel, logLevels } from 'standard-log'
import { createUI } from './ui.js'

export function mockUI(id = 'mock-ui', logLevel: LogLevel = logLevels.debug) {
  const sl = createStandardLogForTest(logLevel)
  return [createUI(sl.getLogger(id)), sl.reporter] as const
}
