import a from 'assertron'
import { assertType, isType } from 'type-plus'
import { cli, z } from './index.js'

it('needs name and version', () => {
	const app = cli({ name: 'app', version: '1.0.0' })
	a.satisfies(app, { name: 'app', version: '1.0.0' })
})

it('can have a short description', () => {
	const app = cli({ name: 'app', version: '1.0.0', description: 'some short description' })
	a.satisfies(app, { name: 'app', version: '1.0.0', description: 'some short description' })
})

it('can set config to true which will try to read config', () => {
	const app = cli({ name: 'app', version: '1.0.0', config: true })
	a.satisfies(app, { name: 'app', version: '1.0.0' })
})

it('can specify a different name for config', () => {
	const app = cli({ name: 'app', version: '1.0.0', config: 'another-name' })
	a.satisfies(app, { name: 'app', version: '1.0.0' })
})

it('can specify a specific config file', () => {
	const app = cli({ name: 'app', version: '1.0.0', config: 'my-app.json' })
	a.satisfies(app, { name: 'app', version: '1.0.0' })
})

it('can specify keywords for plugin discovery', () => {
	const app = cli({ name: 'app', version: '1.0.0', keywords: ['my-app', 'linting'] })
	a.satisfies(app, { name: 'app', version: '1.0.0' })
})

it('can specify type of the arguments and options. The command will receive the typed `args`', () => {
	cli({ name: 'app', version: '1.0.0' }).default({
		arguments: [
			{ name: 'a', description: 'what does it do?', type: z.string() },
			{ name: 'b', description: 'what does it do?', type: z.boolean() },
			{ name: 'c', description: 'what does it do?', type: z.array(z.number()) }
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
				a: string
				b: boolean
				c: number[]
				ob: boolean
				obm: boolean[]
				on: number
				onm: number[]
				os: string
				osm: string[]
				oob: boolean | undefined
				oobm: boolean[] | undefined
				oon: number | undefined
				oonm: number[] | undefined
				oos: string | undefined
				oosm: string[] | undefined
				help: boolean | undefined
			}>(args)
		}
	})
})

it(`can also leave arguments and options not typed,
which will default to string and boolean respectively`, () => {
	cli({ name: 'app', version: '1.0.0' }).default({
		arguments: [{ name: 'a', description: 'some a' }],
		options: { b: { description: 'some b' } },
		run(args) {
			isType.equal<true, string, typeof args.a>()
			isType.equal<true, boolean | undefined, typeof args.b>()
		}
	})
})

it('can specify the config used by the command', () => {
	cli({ name: 'app', version: '1.0.0' }).default({
		config: z.object({
			c: z.boolean()
		}),
		run() {
			isType.equal<true, boolean, typeof this.config.c>()
		}
	})
})
