import { getLogger, Logger, logLevel } from 'standard-log'
import yargs from 'yargs-parser'

const log: Logger = getLogger('clibuilder', { level: logLevel.none })

export { log }

// istanbul ignore next
if (yargs(process.argv)['debug-cli']) {
  log.level = logLevel.debug
}
