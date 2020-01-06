import { logLevels } from 'standard-log'
import { log } from '../log'

export function enableDebugCli() {
  log.level = logLevels.debug
}
