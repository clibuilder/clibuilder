import test from 'ava'

import {
  // createCliWithCommands,
  createNoCommandCli,
  createArgv
} from './test/util'

test.skip('Show basic help', _t => {
  const cli = createNoCommandCli('help')
  cli.run(createArgv())
})
