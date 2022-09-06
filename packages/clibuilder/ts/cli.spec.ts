import { a } from 'assertron'
import { assertType } from 'type-plus'
import { cli, z } from './index.js'

describe('create', () => {
  test('with options', () => {
    const app = cli({ name: 'app', version: '1.0.0', description: 'my app' })
    a.satisfies(app, { name: 'app', version: '1.0.0', description: 'my app' })
  })
})

test('args is typed based on arguments and options, with default options', () => {
  cli().default({
    arguments: [
      { name: 'a', description: 'asd', type: z.string() },
      { name: 'b', description: 'asd', type: z.boolean() },
      { name: 'c', description: 'asd', type: z.array(z.number()) }
    ],
    options: {
      ob: { type: z.boolean(), description: 'a' },
      obm: { type: z.array(z.boolean()), description: 'a' },
      on: { type: z.number(), description: 'a' },
      onm: { type: z.array(z.number()), description: 'a' },
      os: { type: z.string(), description: 'a' },
      osm: { type: z.array(z.string()), description: 'a' },
      oob: { type: z.optional(z.boolean()), description: 'a' },
      oobm: { type: z.optional(z.array(z.boolean())), description: 'a' },
      oon: { type: z.optional(z.number()), description: 'a' },
      oonm: { type: z.optional(z.array(z.number())), description: 'a' },
      oos: { type: z.optional(z.string()), description: 'a' },
      oosm: { type: z.optional(z.array(z.string())), description: 'a' }
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
