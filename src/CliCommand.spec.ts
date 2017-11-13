import test from 'ava'

import { CliCommand } from './CliCommand'

test('using custom context', t => {
  const spec = {
    name: 'a',
    run() {
      t.falsy(this.x)
    }
  } as CliCommand<undefined, { x: string }>

  t.truthy(spec)

  const spec2 = {
    name: 'b',
    run() {
      // `this` should be `Command` by default
      t.truthy(this.ui)
    }
  } as CliCommand

  t.truthy(spec2)
})
