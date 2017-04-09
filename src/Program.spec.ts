// import test from 'ava'

import './test/setup'

import { Program } from './Program'

test('getCommandAndAliasNames()', () => {
  const program = new Program({
    name: 'Program.spec',
    commands: []
  })
  expect(program.getCommandAndAliasNames()).toEqual([])
})
