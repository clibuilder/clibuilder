import test from 'ava'
import { Cli } from './Cli'

test('Cli context shape should follow input literal', t => {
  const cli = new Cli({
    name: '',
    version: ''
  }, [], { cwd: '', abc: '123' })
  t.truthy(cli)

  const cli2 = new Cli({
    name: '',
    version: ''
  }, [], { abc: '123' })
  t.truthy(cli2)
})
