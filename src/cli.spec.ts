import a from 'assertron'
import { assertType, HasKey, isType } from 'type-plus'
import * as z from 'zod'
import { cli } from './cli'

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
      osm: { type: z.array(z.string()), description: 'a' }
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
        help: boolean,
        silent: boolean,
        verbose: boolean
      }>(args)
    }
  })
})

test('loadConfig, loadPlugins, and default removes itself after called', () => {
  const a = cli().loadConfig().loadPlugins().default({} as any)
  isType.false<HasKey<typeof a, 'default' | 'loadConfig' | 'loadPlugins'>>()
})

// function def<
//   Name extends string,
//   A extends Arg<Name>[],
//   >(cmd: Cmd<A>) { return cmd }

// type Cmd<
//   A extends Arg[]
//   > = {
//     arguments: A,
//     run(
//       args: RunArgs<A>
//     ): void
//   }
// type Arg<
//   Name extends string = string,
//   Type extends ZodType<any, any> = ZodType<any, any>
//   > = { name: Name, type: Type }
// type RunArgs<
//   A extends Arg[],
//   > =
//   A extends Arg<infer N>[] ?
//   { [k in N]: z.infer<Extract<ArrayValue<A>, { name: k }>['type']> } :
//   never

// def({
//   arguments: [
//     { name: 'ab', type: z.array(z.string()) },
//     { name: 'c', type: z.string() }
//   ],
//   run(args) {
//     args.ab
//     // assertType.isString(args)
//   }
// })
