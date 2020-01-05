import { getLogger, Logger, logLevel } from 'standard-log'

const log: Logger = getLogger('clibuilder', { level: logLevel.none })

export { log }

// istanbul ignore next
if (process.argv.indexOf('--debug-cli') >= 0) {
  log.level = logLevel.debug
}
