import type { RequiredPick, UnionOfValues } from 'type-plus'
import { builder } from './app/builder.js'
import type { UI } from './core/ports.js'
import { context } from './drivers/context.js'
import type { lookupCommand } from './invocation/lookup.js'
import type { CollectionKey, Registry, RegistryKey, ValueKey } from './plugins/registry.js'
import type { z } from './zod.js'

export function cli(options: RequiredPick<cli.Options, 'config'>): cli.Builder & cli.Executable
export function cli(options: cli.Options): cli.Builder
export function cli(options: cli.Options): cli.Builder {
	return builder(context(), options)
}

export namespace cli {
	export type Options = {
		/**
		 * Name of the cli
		 */
		name: string
		/**
		 * Version of the cli.
		 * This is typically the same as your package version.
		 */
		version: string
		/**
		 * A short description of the cli.
		 */
		description?: string
		/**
		 * Indicate the cli accepts configuration.
		 * Set it to true to read config based on the cli name,
		 * or specify a different config name.
		 */
		config?: string | boolean
		/**
		 * Keywords associated with this cli.
		 * When specified, plugin commands will be available to search for available plugins.
		 */
		keywords?: string[]
		/**
		 * Takes over how usage errors are reported for every command
		 * that does not declare its own `onUsageError`.
		 *
		 * @see UsageErrorHandler
		 */
		onUsageError?: UsageErrorHandler
	}

	/**
	 * Takes over how usage errors are reported:
	 * an unknown option, a missing or extra argument, an invalid value.
	 *
	 * When one applies, clibuilder does not print the errors or the help.
	 * The handler decides what to write, where, and whether to call `ui.showHelp()`.
	 *
	 * The handler used is the matched command's own,
	 * else the nearest enclosing command's,
	 * else the one on `cli()` options.
	 * Commands added by plugins resolve the same way.
	 *
	 * The cli exits with `exitCodes.usage` (2),
	 * unless the handler returns a different exit code.
	 *
	 * @param errors the structured errors found while parsing the arguments.
	 * @param context.command the matched command, including its declared `arguments` and `options`.
	 * @param context.ui the matched command's `ui`.
	 */
	export type UsageErrorHandler = (
		errors: UsageError[],
		context: { command: Command; ui: UI }
		// biome-ignore lint/suspicious/noConfusingVoidType: a handler that returns nothing keeps the usage exit code
	) => void | number | Promise<void | number>

	/**
	 * One error found while parsing the arguments.
	 * `type` tells which kind it is: `invalid-key`, `missing-argument`,
	 * `extra-arguments`, `invalid-value`, or `expect-single`.
	 */
	export type UsageError = lookupCommand.Error

	export type Builder = {
		readonly name: string
		readonly version: string
		readonly description: string
		default<
			T,
			ConfigType extends z.ZodTypeAny,
			AName extends string,
			A extends Command.Argument<AName>[],
			OName extends string,
			O extends Command.Options<OName>
		>(this: T, command: Command.DefaultCommand<ConfigType, A, O>): Omit<T, 'default'> & Executable
		command<
			T,
			Context extends Record<string, any>,
			ConfigType extends z.ZodTypeAny,
			AName extends string,
			A extends Command.Argument<AName>[],
			OName extends string,
			O extends Command.Options<OName>
		>(this: T, command: Command<Context, ConfigType, A, O>): T & Executable
	}

	export type Executable = {
		parse<R = any>(argv: string[]): Promise<R>
	}

	export type Command<
		Context extends Record<string, any> = Record<string, any>,
		ConfigType extends z.ZodTypeAny = z.ZodTypeAny,
		A extends Command.Argument[] = Command.Argument[],
		O extends Command.Options = Command.Options
	> = {
		name: string
		description?: string
		alias?: string[]
		config?: ConfigType
		arguments?: A
		options?: O
		/**
		 * Takes over how usage errors are reported for this command and its sub-commands.
		 *
		 * @see UsageErrorHandler
		 */
		onUsageError?: UsageErrorHandler
	} & (
		| {
				commands?: Command[]
				context?: Context
				run(
					this: {
						ui: UI
						config: z.infer<ConfigType>
						keywords: string[]
						cwd: string
						context: Context
						registry: Registry
					},
					args: Command.RunArgs<A, O>
				): Promise<any> | any
		  }
		| {
				commands: Command[]
		  }
	)

	export namespace Command {
		export type DefaultCommand<
			ConfigType extends z.ZodTypeAny = z.ZodTypeAny,
			A extends Argument[] = Argument[],
			O extends Options = Options
		> =
			| {
					description?: string
					alias?: string[]
					config?: ConfigType
					arguments?: A
					options?: O
					onUsageError?: UsageErrorHandler
					commands?: Command[]
					run(
						this: {
							ui: UI
							config: z.infer<ConfigType>
							keywords: string[]
							cwd: string
							registry: Registry
						},
						args: RunArgs<A, O>
					): Promise<any> | any
			  }
			| {
					description?: string
					alias?: string[]
					config?: ConfigType
					arguments?: A
					options?: O
					onUsageError?: UsageErrorHandler
					commands: Command[]
			  }

		export type Argument<
			Name extends string = string,
			Type extends z.ZodType<any> | z.ZodOptionalType<z.ZodType<any>> = z.ZodType<any>
		> = { name: Name; description: string; type?: Type }

		export type Options<
			Name extends string = string,
			Type extends z.ZodType<any> | z.ZodOptionalType<z.ZodType<any>> = z.ZodType<any>
		> = Record<Name, Options.Entry<Type>>

		export namespace Options {
			export type Default = {
				help: boolean | undefined
			}
			export type Entry<Type extends z.ZodType<any> | z.ZodOptionalType<z.ZodType<any>> = z.ZodType<any>> = {
				description: string
				type?: Type
				default?: z.infer<Type>
				alias?: Alias[]
				/**
				 * Names of the options this one cannot be used with.
				 * Passing both is a usage error. A default value does not count as passed.
				 */
				conflicts?: string[]
			}

			export type Alias = string | { alias: string; hidden: boolean }
		}
		export type RunArgs<A extends Argument[], O extends Options> = A extends Argument<infer AName>[]
			? O extends Options<infer OName>
				? {
						[k in AName]: Extract<UnionOfValues<A>, { name: k }>['type'] extends infer AT
							? AT extends z.ZodType<any>
								? z.infer<AT>
								: string
							: never
					} & {
						[k in OName]: O[k]['type'] extends infer OT
							? OT extends z.ZodType<any>
								? z.infer<OT>
								: boolean | undefined
							: never
					} & (string extends OName ? Options.Default : Omit<Options.Default, OName>)
				: never
			: never
	}
}

export type PluginActivationContext = {
	addCommand<
		Context extends Record<string, any>,
		ConfigType extends z.ZodTypeAny,
		AName extends string,
		A extends cli.Command.Argument<AName>[],
		OName extends string,
		O extends cli.Command.Options<OName>
	>(command: cli.Command<Context, ConfigType, A, O>): void
	register<T>(key: ValueKey<T> | CollectionKey<T>, value: T): void
	get<T>(key: ValueKey<T>): T | undefined
	get<T>(key: CollectionKey<T>): readonly { readonly source: string; readonly value: T }[]
	has(key: RegistryKey<unknown>): boolean
	readonly host: { readonly name: string; readonly version: string }
}
