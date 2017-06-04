// import test from 'ava'

// import { memoryAppender } from './test/setup'

// import {
//   // createCliWithCommands,
//   createNoCommandCli,
//   createArgv
// } from './test/util'

// test.beforeEach(() => {
//   memoryAppender.logs = []
// })

// test.skip('Show basic help', t => {
//   const cli = createNoCommandCli('help')
//   cli.parse(createArgv())
//   const messages = memoryAppender.logs.map(l => l.messages[0])
//   t.deepEqual(messages, [
//     'Usage help'
//   ])
// })
