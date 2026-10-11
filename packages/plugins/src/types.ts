import type { CollectionKey, cli, RegistryKey, ValueKey, z } from 'clibuilder'

/**
 * What a plugin's `activate(context)` receives.
 *
 * The shape is the one `clibuilder` 11 hands a plugin, so a plugin built for it loads unchanged.
 * Import it from here: the copy in `clibuilder` is deprecated in v12 and removed in v13.
 */
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
