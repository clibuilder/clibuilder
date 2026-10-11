// Mirrors cyber-mux's cli-options.ts and cli.ts: shared option constants annotated with zod types,
// `z.optional(...)` everywhere, a command-level `format` option, and returned values in `run()`.
// TODO(clibuilder-12): `z` is removed from clibuilder 12. 4 use(s) below are flagged; rewrite them with `t`, then remove `z` from this import.
import { cli, t, z } from 'clibuilder'

// TODO(clibuilder-12): zod type `z.ZodOptional<z.ZodEnum<['text', 'json', 'agent']>>` has no clibuilder 12 equivalent. Drop the annotation and let the `t` descriptor infer it, or use `satisfies`.
export const FORMAT_OPTION: { description: string; type: z.ZodOptional<z.ZodEnum<['text', 'json', 'agent']>> } = {
	description: 'Output format',
	type: t.enum(['text', 'json', 'agent']).optional(),
}

export const ENV_OPTION: {
	description: string
	// TODO(clibuilder-12): zod type `z.ZodOptional<z.ZodArray<z.ZodString>>` has no clibuilder 12 equivalent. Drop the annotation and let the `t` descriptor infer it, or use `satisfies`.
	type: z.ZodOptional<z.ZodArray<z.ZodString>>
	conflicts: string[]
} = {
	description: 'Environment variable KEY=VALUE (repeatable)',
	type: t.array(t.string()).optional(),
	conflicts: ['template'],
}

// TODO(clibuilder-12): zod type `z.ZodOptional<z.ZodString>` has no clibuilder 12 equivalent. Drop the annotation and let the `t` descriptor infer it, or use `satisfies`.
export const LABEL_OPTION: { description: string; type: z.ZodOptional<z.ZodString> } = {
	description: 'Name for the opened workspace/tab/pane',
	type: t.string().optional(),
}

type MuxCommand = cli.Command

function muxCommand<AName extends string, A extends cli.Command.Argument<AName>[], O extends cli.Command.Options>(
	// TODO(clibuilder-12): zod type `z.ZodTypeAny` has no clibuilder 12 equivalent. Drop the annotation and let the `t` descriptor infer it, or use `satisfies`.
	cmd: cli.Command<Record<string, never>, z.ZodTypeAny, A, O>,
): MuxCommand {
	return cmd as unknown as MuxCommand
}

export function templateEditCommand(): MuxCommand {
	return muxCommand({
		name: 'edit',
		description: 'Edit a template',
		arguments: [{ name: 'name', description: 'Template name', type: t.string().optional() }],
		options: {
			// TODO(clibuilder-12): clibuilder 12 declares a global `--format <toon|json|text>`, and a command declaring its own `format` option is a startup error. Delete this option and read `this.format`.
			format: FORMAT_OPTION,
			file: { description: 'Edit this path instead', type: t.string().optional() },
			set: {
				description: 'Set a field (repeatable)',
				type: t.array(t.string()).optional(),
			},
			field: {
				description: 'The field to set',
				type: t.enum(['command', 'label']).optional(),
			},
			lines: { description: 'Lines to keep', type: t.int({ min: 1, max: 500 }).optional() },
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
		// TODO(clibuilder-12): clibuilder 12 declares a global `--format <toon|json|text>`, and a command declaring its own `format` option is a startup error. Delete this option and read `this.format`.
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
