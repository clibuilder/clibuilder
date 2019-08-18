import {
  getLogger,
  Logger,
  logLevel,
  addAppender,
} from '@unional/logging'
import yargs from 'yargs-parser';
import { ColorAppender } from 'aurelia-logging-color';

const log: Logger = getLogger('clibuilder', logLevel.none)

export { log }

// istanbul ignore next
if (yargs(process.argv)['debug-cli']) {
  addAppender(new ColorAppender())
  log.level = logLevel.debug
}
