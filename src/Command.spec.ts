import test from 'ava'

import { CommandSpec } from './Command'

test('using custom context', t => {
  const spec = {
    name: 'a',
    run() {
      t.falsy(this.x)
    }
  } as CommandSpec<{ x: string }>

  t.truthy(spec)

  const spec2 = {
    name: 'b',
    run() {
      // `this` should be `Command` by default
      t.truthy(this.ui)
    }
  } as CommandSpec

  t.truthy(spec2)
})
