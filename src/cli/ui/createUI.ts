import { getLogger } from 'standard-log'

export function createUI() {
  const log = getLogger('clibuilder')
  return {
    ...log
  }
}
