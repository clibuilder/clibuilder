// Every supported zod form, and the forms the codemod flags instead of rewriting.
import { command, z } from 'clibuilder'

export const supported = command({
	name: 'supported',
	options: {
		name: { type: z.string() },
		ratio: { type: z.number().min(0).max(1) },
		count: { type: z.number().int() },
		port: { type: z.number().int().min(1).max(65535).optional() },
		release: { type: z.string().regex(/^v\d+$/) },
		dry: { type: z.boolean().optional() },
		mode: { type: z.literal('fast') },
		level: { type: z.enum(['low', 'normal', 'high']) },
		tags: { type: z.array(z.string()) },
		ids: { type: z.optional(z.array(z.number().int())) },
		size: { type: z.union([z.literal('s'), z.literal('m'), z.literal('l')]).optional() },
	},
	run() {},
})

export const unsupported = command({
	name: 'unsupported',
	options: {
		email: { type: z.string().email() },
		short: { type: z.string().min(3) },
		count: { type: z.coerce.number() },
		upper: { type: z.string().transform((s) => s.toUpperCase()) },
		mixed: { type: z.union([z.literal('a'), z.number()]) },
		withDefault: { type: z.string().default('x') },
	},
	config: z.object({ name: z.string() }),
	run() {},
})

export type Options = z.infer<typeof unsupported>
