// // import { logLevel, getLevel } from 'aurelia-logging'
// import test from 'ava'
// import { stub } from 'sinon'

// import { createCliWithCommands, createArgv } from './test/util'

// test('invoke command by name', t => {
//   const process = stub()
//   const cli = createCliWithCommands('cmdByName', {
//     name: 'a',
//     process
//   })
//   cli.parse(createArgv('a'))

//   t.true(process.called)
// })
// test('invoke command by alias', t => {
//   const process = stub()
//   const cli = createCliWithCommands('cmdByAlias', {
//     name: 'a',
//     alias: ['b'],
//     process
//   })
//   cli.parse(createArgv('b'))
//   t.true(process.called)
// })
// test('invoke command by second alias', t => {
//   const process = stub()
//   const cli = createCliWithCommands('cmdByAlias2', {
//     name: 'a',
//     alias: ['b', 'c'],
//     process
//   })
//   cli.parse(createArgv('c'))
//   t.true(process.called)
// })
