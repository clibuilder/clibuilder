import test from 'ava'

import { Cli } from './Cli'
import { createCliArgv } from './test-util/index';
import { Command } from './Command';

test('Cli context shape should follow input literal', t => {
  const cli = new Cli({
    name: '',
    version: '',
    commands: []
  }, { cwd: '', abc: '123' })
  t.truthy(cli)

  const cli2 = new Cli({
    name: '',
    version: '',
    commands: []
  }, { abc: '123' })
  t.truthy(cli2)
})

test('run nested command', async t => {
  const cli = new Cli({
    name: 'clibuilder',
    version: '1.1.11',
    commands: [{
      name: 'cmd',
      run() {
        throw new Error('should not run')
      },
      commands: [{
        name: 'nested-cmd',
        run() {
          t.pass()
        }
      }]
    }]
  }, { cwd: '', abc: '123' })
  await cli.parse(createCliArgv('clibuilder', 'cmd', 'nested-cmd'))
})

test('support extending context', t => {
  const cli = new Cli({
    name: 'cli',
    version: '1.2.1',
    commands: [{
      name: 'cmd',
      run() {
        t.not(this.custom, undefined)
      }
    } as Command<{ custom: boolean }>]
  }, { cwd: '', custom: true })
  return cli.parse(createCliArgv('cli', 'cmd'))
})
