import type { cli } from './cli.js'
import type { z } from './zod.js'

/**
 * Helper function to define a command.
 *
 * @example
 * ```ts
 * const cmd = command({
 * 	name: 'cmd',
 * 	description: 'command description',
 * 	options: {
 * 		abc: { description: 'abc' }
 * 	},
 * 	run(args) {
 * 		this.ui.info(args.abc)
 * 	}
 * })
 * ```
 */
export function command<
	Context extends Record<string, any>,
	ConfigType extends z.ZodTypeAny = z.ZodTypeAny,
	AName extends string = string,
	A extends cli.Command.Argument<AName>[] = cli.Command.Argument<AName>[],
	O extends cli.Command.Options = cli.Command.Options
>(cmd: cli.Command<Context, ConfigType, A, O>) {
	return cmd
}
