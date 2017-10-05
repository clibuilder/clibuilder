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
})
