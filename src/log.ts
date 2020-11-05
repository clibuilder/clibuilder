import { getLogger, Logger, logLevels } from 'standard-log'

const log: Logger = getLogger('clibuilder', { level: logLevels.none })

export { log }

// istanbul ignore next
if (process.argv.indexOf('--debug-cli') >= 0) {
  log.level = logLevels.debug
}
