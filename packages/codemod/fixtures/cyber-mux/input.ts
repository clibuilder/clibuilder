// Mirrors cyber-mux's cli-options.ts and cli.ts: shared option constants annotated with zod types,
// `z.optional(...)` everywhere, a command-level `format` option, and returned values in `run()`.
import { cli, z } from 'clibuilder'

export const FORMAT_OPTION: { description: string; type: z.ZodOptional<z.ZodEnum<['text', 'json', 'agent']>> } = {
	description: 'Output format',
	type: z.optional(z.enum(['text', 'json', 'agent'])),
}

export const ENV_OPTION: {
	description: string
	type: z.ZodOptional<z.ZodArray<z.ZodString>>
	conflicts: string[]
} = {
	description: 'Environment variable KEY=VALUE (repeatable)',
	type: z.optional(z.array(z.string())),
	conflicts: ['template'],
}

export const LABEL_OPTION: { description: string; type: z.ZodOptional<z.ZodString> } = {
	description: 'Name for the opened workspace/tab/pane',
	type: z.optional(z.string()),
}

type MuxCommand = cli.Command

function muxCommand<AName extends string, A extends cli.Command.Argument<AName>[], O extends cli.Command.Options>(
	cmd: cli.Command<Record<string, never>, z.ZodTypeAny, A, O>,
): MuxCommand {
	return cmd as unknown as MuxCommand
}

export function templateEditCommand(): MuxCommand {
	return muxCommand({
		name: 'edit',
		description: 'Edit a template',
		arguments: [{ name: 'name', description: 'Template name', type: z.optional(z.string()) }],
		options: {
			format: FORMAT_OPTION,
			file: { description: 'Edit this path instead', type: z.optional(z.string()) },
			set: {
				description: 'Set a field (repeatable)',
				type: z.optional(z.array(z.string())),
			},
			field: {
				description: 'The field to set',
				type: z.optional(z.enum(['command', 'label'])),
			},
			lines: { description: 'Lines to keep', type: z.number().int().min(1).max(500).optional() },
		},
		async run(args) {
			if (!args.name) return
			const result = await Promise.resolve({ name: args.name })
			return result
		},
	})
}

export function doctorCommand(): MuxCommand {
	return muxCommand({
		name: 'doctor',
		description: 'Probe the multiplexer',
		options: { format: FORMAT_OPTION },
		run() {
			const data = { mux: 'tmux' }
			const helper = () => {
				return 'not a run() return'
			}
			helper()
			return data
		},
	})
}
