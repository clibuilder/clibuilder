import t from 'assert'

import { CliCommand } from './index'

// todo: custom context test is not complete
test('using custom context', () => {
  const spec = {
    name: 'a',
    run() {
      t.strictEqual(this.x, undefined)
    }
  } as CliCommand<undefined, { x: string }>

  t(spec)

  const spec2 = {
    name: 'b',
    run() {
      // `this` should be `Command` by default
      t(this.ui)
    }
  } as CliCommand

  t(spec2)
})
