import test from 'ava'

import { Cli } from './Cli'
import { createCliArgv, InMemoryPresenter } from './test-util/index';
import { Command } from './Command';
import { PresenterFactory } from './index';

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

function createInquirePresenterFactory(answers) {
  const presenterFactory = new PresenterFactory()
  presenterFactory.createCommandPresenter = options => new InMemoryPresenter(options, answers)
  return presenterFactory
}

test('prompt for input', async t => {
  const presenterFactory = createInquirePresenterFactory({ username: 'me' })
  const cli = new Cli({
    name: 'cli',
    version: '1.2.1',
    commands: [{
      name: 'ask',
      async run() {
        const answers = await this.ui.prompt([{ name: 'username', message: 'Your username' }])
        t.is(answers.username, 'me')
      }
    }]
  }, { presenterFactory })

  t.plan(1)
  await cli.parse(createCliArgv('cli', 'ask'))
})
