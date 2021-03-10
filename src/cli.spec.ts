import a from 'assertron'
import { assertType } from 'type-plus'
import { cli, types } from '.'

describe('create', () => {
  test('with options', () => {
    const app = cli({ name: 'app', version: '1.0.0', description: 'my app' })
    a.satisfies(app, { name: 'app', version: '1.0.0', description: 'my app' })
  })
})

test('args is typed based on arguments and options, with default options', () => {
  cli().default({
    arguments: [
      { name: 'a', description: 'asd', type: types.string() },
      { name: 'b', description: 'asd', type: types.boolean() },
      { name: 'c', description: 'asd', type: types.array(types.number()) }
    ],
    options: {
      ob: { type: types.boolean(), description: 'a' },
      obm: { type: types.array(types.boolean()), description: 'a' },
      on: { type: types.number(), description: 'a' },
      onm: { type: types.array(types.number()), description: 'a' },
      os: { type: types.string(), description: 'a' },
      osm: { type: types.array(types.string()), description: 'a' },
      oob: { type: types.optional(types.boolean()), description: 'a' },
      oobm: { type: types.optional(types.array(types.boolean())), description: 'a' },
      oon: { type: types.optional(types.number()), description: 'a' },
      oonm: { type: types.optional(types.array(types.number())), description: 'a' },
      oos: { type: types.optional(types.string()), description: 'a' },
      oosm: { type: types.optional(types.array(types.string())), description: 'a' }
    },
    run(args) {
      assertType<{
        a: string,
        b: boolean,
        c: number[],
        ob: boolean,
        obm: boolean[],
        on: number,
        onm: number[],
        os: string,
        osm: string[],
        oob: boolean | undefined,
        oobm: boolean[] | undefined,
        oon: number | undefined,
        oonm: number[] | undefined,
        oos: string | undefined,
        oosm: string[] | undefined,
        help: boolean | undefined
      }>(args)
    }
  })
})
