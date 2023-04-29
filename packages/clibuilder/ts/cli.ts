import { RequiredPick, UnionOfValues } from 'type-plus'
import * as z from 'zod'
import { builder } from './builder.js'
import { context } from './context.js'

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
	}

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
		>(
			this: T,
			command: Command.DefaultCommand<ConfigType, A, O>
		): Omit<T, 'default'> & Executable
		command<
			T,
			Context extends Record<string, any>,
			ConfigType extends z.ZodTypeAny,
			AName extends string,
			A extends Command.Argument<AName>[],
			OName extends string,
			O extends Command.Options<OName>
		>(
			this: T,
			command: Command<Context, ConfigType, A, O>
		): T & Executable
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
					commands?: Command[]
					run(
						this: {
							ui: UI
							config: z.infer<ConfigType>
							keywords: string[]
							cwd: string
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
			export type Entry<
				Type extends z.ZodType<any> | z.ZodOptionalType<z.ZodType<any>> = z.ZodType<any>
			> = {
				description: string
				type?: Type
				default?: z.infer<Type>
				alias?: Alias[]
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

export type DisplayLevel = 'none' | 'info' | 'debug' | 'trace'

export type UI = {
	displayLevel: DisplayLevel
	info(...args: any[]): void
	warn(...args: any[]): void
	error(...args: any[]): void
	debug(...args: any[]): void
	showHelp(): void
	showVersion(): void
}

export type PluginActivationContext = {
	addCommand<
		Context extends Record<string, any>,
		ConfigType extends z.ZodTypeAny,
		AName extends string,
		A extends cli.Command.Argument<AName>[],
		OName extends string,
		O extends cli.Command.Options<OName>
	>(
		command: cli.Command<Context, ConfigType, A, O>
	): void
}
