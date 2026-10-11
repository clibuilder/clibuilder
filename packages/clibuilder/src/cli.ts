import type { DefaultOf } from 'args-minus'
import { builder } from './app/builder.js'
import type { ConfigLoadResult } from './config.js'
import type { Output as OutputMode, Streams as StreamsPort, UI } from './core/ports.js'
import { context } from './drivers/context.js'
import type { lookupCommand } from './invocation/lookup.js'
import type { CollectionKey, Registry, RegistryKey, RegistryOwner, ValueKey } from './plugins/registry.js'
import type { AnyDescriptor, OutputOf, StandardSchemaV1 } from './t.js'
import type { UnionOfValues } from './type_utils.js'

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
		 * How the cli writes its output.
		 *
		 * - `'axi'` (default): stdout carries only answers. A value `run()` returns is printed in `this.format`,
		 *   a thrown `CliError` and a usage error are reported once, encoded, and `--help` follows `--format`.
		 *   Every `ui` message is a diagnostic on stderr.
		 * - `'console'`: the clibuilder 11 layout. Returned values are not printed,
		 *   a `CliError` and a usage error go to stderr as prose, a usage error is followed by the full help,
		 *   `info` and `debug` are on stdout, `warn` and `error` on stderr.
		 *
		 * Both modes are permanent.
		 */
		output?: Output
		/**
		 * The cli's default format: `'toon'` (default), `'json'` or `'text'`.
		 *
		 * Every cli has the global `--format <toon|json|text>` option, in either output mode.
		 * The caller's `--format` overrides this default for one invocation, and `run()` reads it as `this.format`.
		 * A command that declares its own `format` option conflicts with the global one and fails the cli at startup.
		 *
		 * With `output: 'axi'`, the default, answers and reports are encoded in the resolved format on stdout.
		 */
		format?: Format
	}

	/**
	 * The two streams a cli writes to.
	 */
	export type Streams = StreamsPort

	/**
	 * How the cli writes its output: `'axi'` (default) or `'console'`.
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
	 * Commands added by extensions resolve the same way.
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
	 * @param context.format the format the cli reports in: the caller's `--format` when the value is valid,
	 * else the `cli({ format })` value, `toon` by default.
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
		 * The format the cli reports in, resolved with the global options before the handler runs:
		 * the caller's `--format`, else the `cli({ format })` value, `toon` by default.
		 * A bad `--format` value is itself a usage error, reported with the default format here.
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
	 *
	 * @see Options.format
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
		>(
			this: T,
			command: Command.DefaultCommand<ConfigType, A, O> & ConfigGuard<T, ConfigType>
		): Omit<T, 'default'> & Executable
		command<
			T,
			Context extends Record<string, any>,
			ConfigType extends ConfigSchema,
			AName extends string,
			A extends Command.Argument<AName>[],
			OName extends string,
			O extends Command.Options<OName>
		>(this: T, command: Command<Context, ConfigType, A, O> & ConfigGuard<T, ConfigType>): T & Executable
		/**
		 * Adds an extension that contributes commands, global options, registry entries
		 * and pre-run hooks before `parse()` picks the command to run.
		 *
		 * Extensions run in the order `use()` was called, each awaited before the next,
		 * on the first `parse()` that needs the command tree.
		 * A bare `--version` is answered without running them.
		 *
		 * `.use(config())` from `clibuilder/config` lets the commands added after it declare `config`.
		 *
		 * @see Extension
		 */
		use<T, E extends Extension>(
			this: T,
			extension: E
		): T & Executable & (E extends ConfigExtension ? ConfigEnabled : unknown)
	}

	/**
	 * A command's `config` is a type error unless the cli has `.use(config())` from `clibuilder/config`,
	 * added before the command.
	 */
	export type ConfigGuard<T, ConfigType> = T extends ConfigEnabled
		? unknown
		: ConfigSchema extends ConfigType
			? unknown
			: { config: ConfigNeedsExtension }

	/**
	 * What a command's `config` is checked against on a cli without `.use(config())`: no schema matches it.
	 */
	export type ConfigNeedsExtension = 'a command declares config: add .use(config()) from clibuilder/config first'

	/**
	 * What a command's `config` can be declared with:
	 * any Standard Schema, such as zod (3.24 or later), valibot or arktype.
	 */
	export type ConfigSchema = StandardSchemaV1

	/**
	 * The config `run()` gets for a `config` schema: the schema's output,
	 * so its defaults and transforms are applied.
	 */
	export type ConfigOf<C extends ConfigSchema> = StandardSchemaV1.InferOutput<C>

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
		 * Example invocations, shown under the command's help and in its structured `--help`.
		 * `command` is the full command line, written as the user types it.
		 * A usage error handler reads them from `context.command.examples`.
		 */
		examples?: Command.Example[]
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
						cwd: string
						context: Context
						registry: Registry
						/**
						 * The format to answer in: the caller's `--format`,
						 * else the `cli({ format })` value, `toon` by default.
						 */
						format: Format
						/**
						 * The cli's output mode, `cli({ output })`: `'axi'` by default.
						 * Under `'axi'` the value `run()` returns is printed (see `result()`).
						 */
						output: Output
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
					examples?: Example[]
					onUsageError?: UsageErrorHandler
					commands?: Command[]
					run(
						this: {
							ui: UI
							config: ConfigOf<ConfigType>
							cwd: string
							registry: Registry
							/**
							 * The format to answer in: the caller's `--format`,
							 * else the `cli({ format })` value, `toon` by default.
							 */
							format: Format
							/**
							 * The cli's output mode, `cli({ output })`: `'axi'` by default.
							 * Under `'axi'` the value `run()` returns is printed (see `result()`).
							 */
							output: Output
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
					examples?: Example[]
					onUsageError?: UsageErrorHandler
					commands: Command[]
			  }

		/**
		 * What an argument or option can be declared with in `type`: a descriptor from `t`.
		 */
		export type Type = AnyDescriptor

		/**
		 * An example invocation of a command.
		 */
		export type Example = {
			/**
			 * The full command line, such as `my-cli deploy --env prod`.
			 */
			command: string
			/**
			 * What the example does.
			 */
			description: string
		}

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
				default?: DefaultOf<OutputOf<T>>
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
								: string
							: never
					} & {
						[k in OName]: O[k]['type'] extends infer OT
							? OT extends AnyDescriptor
								? DescriptorValue<
										OT,
										O[k] extends { default: unknown } ? true : OT extends { isOptional: false } ? true : false
									>
								: boolean | undefined
							: never
					} & (string extends OName ? Options.Default : Omit<Options.Default, OName>)
				: never
			: never
	}
}

/**
 * What a plugin's `activate(context)` receives.
 *
 * @deprecated import `PluginActivationContext` from `@clibuilder/plugins`, which loads plugins since clibuilder 12.
 * This structural copy keeps existing plugins compiling. Removed in clibuilder 13.
 */
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
 * It is how `clibuilder/config` loads config and `@clibuilder/plugins` loads plugins,
 * and how any other package can add commands, global options and pre-run hooks,
 * or share values through the registry.
 */
export type Extension = (context: ExtensionContext) => void | Promise<void>

declare const configEnabled: unique symbol

/**
 * The extension `config()` from `clibuilder/config` returns.
 * `.use()` of it lets the commands added after it declare `config`.
 */
export type ConfigExtension = Extension & { readonly [configEnabled]: true }

/**
 * A builder that has `.use(config())`, so its commands may declare `config`.
 */
export type ConfigEnabled = { readonly [configEnabled]: true }

/** What an {@link Extension} receives: the host, the registry, and the hooks to extend the cli. */
export type ExtensionContext = {
	readonly host: { readonly name: string; readonly version: string }
	readonly cwd: string
	readonly ui: UI
	readonly registry: RegistryOwner
	/**
	 * Values extensions share with each other for this cli, keyed like the registry with `defineKey()`.
	 * Unlike the registry, a value can be replaced, and the commands do not see it.
	 */
	readonly shared: SharedState
	/**
	 * Adds a command after the host's own `.command()` and `.default()` commands.
	 */
	addCommand(command: cli.Command<any, any, any, any>): void
	/**
	 * Adds a global option, listed with `--help`, `--verbose` and the other options every command accepts.
	 *
	 * When the caller passes it, `answer` runs instead of the matched command, after the logging flags apply.
	 * What it returns is the answer, as for `run()`: under `output: 'axi'` it is printed in the resolved format.
	 */
	addGlobalOption(name: string, entry: cli.Command.Options.Entry, answer: GlobalOptionAnswer): void
	/**
	 * Adds a hook that runs before the matched command's `run()`, once its arguments are valid.
	 * Hooks run in the order they were added. A hook fails the command by throwing a `CliError`.
	 */
	beforeRun(hook: BeforeRunHook): void
	/**
	 * The cli's config and where it came from, as the `clibuilder/config` extension resolved it.
	 * `source.type` is `'none'` when the cli has no `.use(config())`, or it is added after this extension.
	 */
	resolveConfig(): Promise<ConfigLoadResult>
}

/**
 * Values shared between extensions.
 *
 * @see ExtensionContext.shared
 */
export type SharedState = {
	get<T>(key: ValueKey<T>): T | undefined
	set<T>(key: ValueKey<T>, value: T): void
	has(key: ValueKey<unknown>): boolean
}

/**
 * Answers a global option an extension added.
 *
 * @see ExtensionContext.addGlobalOption
 */
export type GlobalOptionAnswer = (context: {
	/**
	 * The option's value, converted by its `type`.
	 */
	value: unknown
	/**
	 * The format to answer in: the caller's `--format`, else the `cli({ format })` value.
	 */
	format: cli.Format
	output: cli.Output
	ui: UI
}) => unknown

/**
 * Runs before the matched command's `run()`.
 *
 * @see ExtensionContext.beforeRun
 */
export type BeforeRunHook = (context: {
	/**
	 * The command about to run.
	 */
	readonly command: cli.Command
	/**
	 * What `run()` reads as `this.config`. A hook may set it.
	 */
	config: unknown
	readonly format: cli.Format
	readonly output: cli.Output
	readonly ui: UI
}) => void | Promise<void>
