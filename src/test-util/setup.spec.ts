import { setupCliCommandTest, CliCommand } from '../'
import { PlainPresenter } from '../PlainPresenter';
import { InMemoryPresenter } from './InMemoryPresenter';

test('specifying Config gets completion support', () => {
  const cmd: CliCommand<{ foo: string }, { boo: string }> = {
    name: 'cmd',
    run() { return }
  }
  // as of tsc@2.6.1, the inferring completion is not complete,
  // it gets `config` but not `boo`,
  // and inside `config` it does not get `foo`.
  // Explicit generic does not have this problem.
  setupCliCommandTest<{ foo: string }, { boo: string }>(cmd, [], { foo: 'foo' }, { boo: 'boo' })
})

test('command with overriden ui still get memory presenter for testing', () => {
  const cmd: CliCommand<{ foo: string }, { boo: string }> = {
    name: 'override-ui',
    run() { return },
    ui: new PlainPresenter()
  }
  const { ui } = setupCliCommandTest<{ foo: string }, { boo: string }>(cmd, [])

  expect(ui).toBeInstanceOf(InMemoryPresenter)
})

test('sub-command with overriden ui still get memory presenter for testing', () => {
  const cmd: CliCommand<{ foo: string }, { boo: string }> = {
    name: 'override-ui-in-sub',
    commands: [{
      name: 'override-ui-sub',
      run() { return },
      ui: new PlainPresenter()
    }]
  }
  const { ui } = setupCliCommandTest<{ foo: string }, { boo: string }>(cmd, [])

  expect(ui).toBeInstanceOf(InMemoryPresenter)
})
