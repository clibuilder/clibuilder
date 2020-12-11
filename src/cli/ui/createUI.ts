import { getLogger, logLevels } from 'standard-log'
import { cli } from '../types'

export function createUI(): cli.UI {
  const log = getLogger('clibuilder')
  log.level = logLevels.info
  return {
    get displayLevel() {
      if (log.level! <= logLevels.none) return 'none'

      if (log.level! <= logLevels.info) return 'info'
      return 'debug'
    },
    set displayLevel(level) {
      switch (level) {
        case 'none':
          log.level = logLevels.none
          break
        case 'info':
        default:
          log.level = logLevels.info
          break
        case 'debug':
          log.level = logLevels.debug
          break
      }
    },
    debug: (...args) => log.debug(...args),
    info: (...args) => log.info(...args),
    warn: (...args) => log.warn(...args),
    error: (...args) => log.error(...args)
  }
}
