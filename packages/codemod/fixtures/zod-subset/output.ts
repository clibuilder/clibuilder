// Every supported zod form, and the forms the codemod flags instead of rewriting.
// TODO(clibuilder-12): `z` is removed from clibuilder 12. 8 use(s) below are flagged; rewrite them with `t`, then remove `z` from this import.
import { command, t, z } from 'clibuilder'

export const supported = command({
	name: 'supported',
	options: {
		name: { type: t.string() },
		ratio: { type: t.number({ min: 0, max: 1 }) },
		count: { type: t.int() },
		port: { type: t.int({ min: 1, max: 65535 }).optional() },
		release: { type: t.string({ pattern: /^v\d+$/ }) },
		dry: { type: t.boolean().optional() },
		mode: { type: t.literal('fast') },
		level: { type: t.enum(['low', 'normal', 'high']) },
		tags: { type: t.array(t.string()) },
		ids: { type: t.array(t.int()).optional() },
		size: { type: t.enum(['s', 'm', 'l']).optional() },
	},
	run() {},
})

export const unsupported = command({
	name: 'unsupported',
	options: {
		// TODO(clibuilder-12): `.email()` is a refinement. `t` has no built-in formats: use `t.string().check(…)` with a function, or a schema from your own zod dependency.
		email: { type: z.string().email() },
		// TODO(clibuilder-12): `.min()` on `z.string()` is a length check; `t` has no length option, so move it to `.check()`.
		short: { type: z.string().min(3) },
		// TODO(clibuilder-12): `z.coerce` is not supported by `t`: a descriptor converts argv itself.
		count: { type: z.coerce.number() },
		// TODO(clibuilder-12): `.transform()` has no `t` equivalent (refinements, transforms, defaults and descriptions are not rewritten).
		upper: { type: z.string().transform((s) => s.toUpperCase()) },
		// TODO(clibuilder-12): Only a `z.union` of string `z.literal`s has a `t` equivalent (`t.enum`).
		mixed: { type: z.union([z.literal('a'), z.number()]) },
		// TODO(clibuilder-12): `.default()` has no `t` equivalent (refinements, transforms, defaults and descriptions are not rewritten).
		withDefault: { type: z.string().default('x') },
	},
	// TODO(clibuilder-12): `z.object` has no `t` equivalent. `config` takes any Standard Schema in clibuilder 12, so import `z` for it from your own `zod` dependency.
	config: z.object({ name: z.string() }),
	run() {},
})

// TODO(clibuilder-12): `z.infer<typeof unsupported>` is removed with zod. Use the type `run()` infers for its `args`, or the type of your own schema.
export type Options = z.infer<typeof unsupported>
