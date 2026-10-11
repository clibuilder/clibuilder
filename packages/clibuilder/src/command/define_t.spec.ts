import { z } from 'zod'
import { type cli, command, t } from '../index.js'

// These assertions are checked by `tsc` (the build), not at runtime.
// Each deliberately wrong expectation sits under `@ts-expect-error`: an unused directive is itself an error.
type Equal<A, B> = (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2 ? true : false
function assert<_ extends true>() {}

it('infers each t option exactly', () => {
	command({
		name: 'cmd',
		options: {
			name: { description: 'd', type: t.string() },
			release: { description: 'd', type: t.string<`v${number}`>({ pattern: /^v\d+$/ }) },
			ratio: { description: 'd', type: t.number({ min: 0, max: 1 }).optional() },
			port: { description: 'd', type: t.int({ min: 1, max: 65535 }), default: 8080 },
			lines: { description: 'd', type: t.int().optional(), default: 10 },
			dry: { description: 'd', type: t.boolean().optional() },
			on: { description: 'd', type: t.literal(true) },
			format: { description: 'd', type: t.enum(['toon', 'text', 'json']), default: 'toon' },
			tag: { description: 'd', type: t.array(t.string()).optional() },
			ports: { description: 'd', type: t.array(t.int()), default: [80] },
			when: { description: 'd', type: t.custom((raw) => new Date(raw)) },
			size: { description: 'd', type: t.custom(async (raw) => raw.length).optional() },
			payload: { description: 'd', type: t.json<{ a: number }>() },
			parsed: { description: 'd', type: t.json(z.object({ a: z.string() })).optional() },
			email: { description: 'd', type: t.string().check(z.string().email()).optional() }
		},
		run(args) {
			assert<Equal<typeof args.name, string>>()
			assert<Equal<typeof args.release, `v${number}`>>()
			assert<Equal<typeof args.ratio, number | undefined>>()
			assert<Equal<typeof args.port, number>>()
			assert<Equal<typeof args.lines, number>>()
			assert<Equal<typeof args.dry, boolean | undefined>>()
			assert<Equal<typeof args.on, true>>()
			assert<Equal<typeof args.format, 'toon' | 'text' | 'json'>>()
			assert<Equal<typeof args.tag, string[] | undefined>>()
			assert<Equal<typeof args.ports, number[]>>()
			assert<Equal<typeof args.when, Date>>()
			assert<Equal<typeof args.size, number | undefined>>()
			assert<Equal<typeof args.payload, { a: number }>>()
			assert<Equal<typeof args.parsed, { a: string } | undefined>>()
			assert<Equal<typeof args.email, string | undefined>>()
			// @ts-expect-error a required option is never undefined
			assert<Equal<typeof args.name, string | undefined>>()
		}
	})
})

it('infers each t argument exactly', () => {
	command({
		name: 'cmd',
		arguments: [
			{ name: 'id', description: 'd', type: t.int() },
			{ name: 'mode', description: 'd', type: t.enum(['a', 'b']).optional() },
			{ name: 'files', description: 'd', type: t.array(t.string()) }
		],
		run(args) {
			assert<Equal<typeof args.id, number>>()
			assert<Equal<typeof args.mode, 'a' | 'b' | undefined>>()
			assert<Equal<typeof args.files, string[]>>()
		}
	})
})

it('infers a command mixing z and t', () => {
	command({
		name: 'cmd',
		arguments: [{ name: 'id', description: 'd', type: t.number() }],
		options: {
			name: { description: 'd', type: t.string().optional() },
			port: { description: 'd', type: t.int() },
			flag: { description: 'd' }
		},
		run(args) {
			assert<Equal<typeof args.id, number>>()
			assert<Equal<typeof args.name, string | undefined>>()
			assert<Equal<typeof args.port, number>>()
			assert<Equal<typeof args.flag, boolean | undefined>>()
		}
	})
})

it('fits a t command where a cli.Command is expected', () => {
	const sub = command({ name: 'sub', options: { port: { description: 'd', type: t.int() } }, run() {} })
	const group: cli.Command = { name: 'group', commands: [sub] }
	assert<Equal<typeof group.name, string>>()
})
