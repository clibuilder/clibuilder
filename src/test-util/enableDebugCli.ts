import { logLevels } from 'standard-log'
import { log } from '../log'

// istanbul ignore next
export function enableDebugCli() {
  log.level = logLevels.debug
}
