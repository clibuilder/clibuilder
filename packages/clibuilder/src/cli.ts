import type { DefaultOf } from 'args-minus'
import type { RequiredPick, UnionOfValues } from 'type-plus'
import { builder } from './app/builder.js'
import type { ConfigLoadResult } from './config.js'
import type { Output as OutputMode, Streams as StreamsPort, UI } from './core/ports.js'
import { context } from './drivers/context.js'
import type { lookupCommand } from './invocation/lookup.js'
import type { CollectionKey, Registry, RegistryKey, RegistryOwner, ValueKey } from './plugins/registry.js'
import type { AnyDescriptor, OutputOf, StandardSchemaV1 } from './t.js'
import type { z } from './zod.js'

export function cli(options: RequiredPick<cli.Options, 'config'>): cli.Builder & cli.Executable
export function cli(options: cli.Options): cli.Builder
export function cli(options: cli.Options): cli.Builder {
	return builder(context({ streams: options.streams, output: options.output }), options)
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
		/**
		 * The streams the cli writes to.
		 * Defaults to `process.stdout` and `process.stderr`.
		 *
		 * Pass your own to capture or redirect the output, such as when embedding the cli.
		 * When the reader of `process.stdout` goes away (`EPIPE`, as in `cli | head -1`),
		 * later writes are dropped and the cli exits 0.
		 * Streams you pass are yours to handle.
		 *
		 * @see Streams
		 */
		streams?: Streams
		/**
		 * Where `ui` messages go.
		 *
		 * - `'console'` (default): `info` and `debug` on stdout, `warn` and `error` on stderr.
		 * - `'axi'`: every `ui` message is a diagnostic on stderr, so stdout carries only answers.
		 *
		 * Both modes are permanent. The default becomes `'axi'` in v12.
		 */
		output?: Output
	}

	/**
	 * The two streams a cli writes to.
	 */
	export type Streams = StreamsPort

	/**
	 * Where `ui` messages go: `'axi'` or `'console'`.
	 *
	 * @see Options.output
	 */
	export type Output = OutputMode

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
	 * The global options are resolved before the handler runs,
	 * so a malformed global flag is one of `errors`, reported once.
	 *
	 * @param errors the structured errors found while parsing the arguments.
	 * @param context.command the matched command, including its declared `arguments` and `options`.
	 * @param context.ui the matched command's `ui`.
	 * @param context.format the format the cli reports in: `toon` until `cli({ format })` and `--format` exist.
	 * @param context.exitCode the code the cli exits with when the handler returns none: `exitCodes.usage`.
	 */
	export type UsageErrorHandler = (
		errors: UsageError[],
		context: UsageErrorContext
		// biome-ignore lint/suspicious/noConfusingVoidType: a handler that returns nothing keeps the usage exit code
	) => void | number | Promise<void | number>

	/**
	 * What an `onUsageError` handler knows besides the errors.
	 *
	 * @see UsageErrorHandler
	 */
	export type UsageErrorContext = {
		/**
		 * The matched command, including its declared `arguments` and `options`.
		 */
		command: Command
		/**
		 * The matched command's `ui`.
		 */
		ui: UI
		/**
		 * The format the cli reports in, resolved before the handler runs.
		 * It is `toon` until `cli({ format })` and the global `--format` option exist.
		 *
		 * clibuilder always sets it. It is optional only so that code calling a handler itself keeps compiling.
		 */
		format?: Format
		/**
		 * The code the cli exits with when the handler returns none: `exitCodes.usage` (2).
		 *
		 * clibuilder always sets it. It is optional only so that code calling a handler itself keeps compiling.
		 */
		exitCode?: number
	}

	/**
	 * The formats a cli reports in.
	 */
	export type Format = 'toon' | 'json' | 'text'

	/**
	 * One error found while parsing the arguments.
	 * `type` tells which kind it is: `invalid-key`, `missing-argument`,
	 * `extra-arguments`, `invalid-value`, `conflicting-options`, or `expect-single`.
	 * `code` is its stable kebab-case code: `unknown-option` for `invalid-key`, else the same as `type`.
	 */
	export type UsageError = lookupCommand.Error

	export type Builder = {
		readonly name: string
		readonly version: string
		readonly description: string
		default<
			T,
			ConfigType extends ConfigSchema,
			AName extends string,
			A extends Command.Argument<AName>[],
			OName extends string,
			O extends Command.Options<OName>
		>(this: T, command: Command.DefaultCommand<ConfigType, A, O>): Omit<T, 'default'> & Executable
		command<
			T,
			Context extends Record<string, any>,
			ConfigType extends ConfigSchema,
			AName extends string,
			A extends Command.Argument<AName>[],
			OName extends string,
			O extends Command.Options<OName>
		>(this: T, command: Command<Context, ConfigType, A, O>): T & Executable
		/**
		 * Adds an extension that contributes commands and registry entries
		 * before `parse()` picks the command to run.
		 *
		 * Extensions run in the order `use()` was called, each awaited before the next,
		 * on the first `parse()` that needs the command tree.
		 * A bare `--version` is answered without running them.
		 *
		 * @see Extension
		 */
		use<T>(this: T, extension: Extension): T & Executable
	}

	/**
	 * What a command's `config` can be declared with:
	 * any Standard Schema, such as zod 4 or valibot, or a zod 3 type from `z`.
	 * The zod 3 form is removed in v12.
	 */
	export type ConfigSchema = z.ZodTypeAny | StandardSchemaV1

	/**
	 * The config `run()` gets for a `config` schema: the schema's output,
	 * so its defaults and transforms are applied.
	 */
	export type ConfigOf<C extends ConfigSchema> = C extends z.ZodTypeAny
		? z.infer<C>
		: C extends StandardSchemaV1
			? StandardSchemaV1.InferOutput<C>
			: never

	export type Executable = {
		/**
		 * Runs the command matched by `argv`.
		 *
		 * Resolves to what the command's `run()` returns.
		 * When the cli fails instead (a usage error, a config that fails validation,
		 * a `CliError`), it resolves to the exit code it records on the process,
		 * so a caller can assign the result without reading `process.exitCode`.
		 */
		parse<R = any>(argv: string[]): Promise<R>
	}

	export type Command<
		Context extends Record<string, any> = Record<string, any>,
		ConfigType extends ConfigSchema = ConfigSchema,
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
						config: ConfigOf<ConfigType>
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
		/**
		 * The value a descriptor declaration gives `run()`: its output type,
		 * or that or `undefined` when the value may be absent.
		 */
		export type DescriptorValue<D extends AnyDescriptor, Present extends boolean> =
			// the unknown descriptor of the default `Options`
			0 extends 1 & OutputOf<D> ? any : Present extends true ? OutputOf<D> : OutputOf<D> | undefined

		export type DefaultCommand<
			ConfigType extends ConfigSchema = ConfigSchema,
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
							config: ConfigOf<ConfigType>
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

		/**
		 * What an argument or option can be declared with in `type`:
		 * a zod type, or a descriptor from `t`.
		 * A command can mix both; each declaration is parsed by its own type.
		 * The zod form is removed in v12.
		 */
		export type Type = z.ZodType<any> | z.ZodOptionalType<z.ZodType<any>> | AnyDescriptor

		export type Argument<Name extends string = string, T extends Type = Type> = {
			name: Name
			description: string
			type?: T
		}

		export type Options<Name extends string = string, T extends Type = Type> = Record<Name, Options.Entry<T>>

		export namespace Options {
			export type Default = {
				help: boolean | undefined
			}
			export type Entry<T extends Type = Type> = {
				description: string
				type?: T
				/**
				 * The value used when the option is not passed.
				 * With a descriptor from `t` it is not converted, but the descriptor's checks run on it.
				 */
				default?: T extends AnyDescriptor ? DefaultOf<OutputOf<T>> : T extends z.ZodTypeAny ? z.infer<T> : never
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
							? AT extends AnyDescriptor
								? DescriptorValue<AT, AT extends { isOptional: false } ? true : false>
								: AT extends z.ZodType<any>
									? z.infer<AT>
									: string
							: never
					} & {
						[k in OName]: O[k]['type'] extends infer OT
							? OT extends AnyDescriptor
								? DescriptorValue<
										OT,
										O[k] extends { default: unknown } ? true : OT extends { isOptional: false } ? true : false
									>
								: OT extends z.ZodType<any>
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
		ConfigType extends cli.ConfigSchema,
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

/**
 * Extends a cli before `parse()` picks the command to run.
 *
 * It is how `@clibuilder/plugins` loads plugins, and how any other package
 * can add commands or share values through the registry.
 */
export type Extension = (context: ExtensionContext) => void | Promise<void>

export type ExtensionContext = {
	readonly host: { readonly name: string; readonly version: string }
	readonly cwd: string
	readonly ui: UI
	readonly registry: RegistryOwner
	/**
	 * Adds a command after the host's own `.command()` and `.default()` commands.
	 */
	addCommand(command: cli.Command<any, any, any, any>): void
	/**
	 * The cli's config and where it came from.
	 * `source.type` is `'none'` when the cli sets no `config`.
	 */
	resolveConfig(): Promise<ConfigLoadResult>
}
