import { forEachKey, type RequiredPick } from 'type-plus'
import { parseArgv } from './argv.js'
import type { cli } from './cli.js'
import type { Command } from './command.internal.types.js'
import { getBaseCommand, pluginsCommand } from './commands.js'
import { describeConfigSource } from './config.js'
import type { Context } from './context.js'
import { exitCodes, formatLookupError, isCliError } from './errors.js'
import { lookupCommand, lookupOptions } from './lookup_command.js'
import { createRegistry } from './registry.js'
import { state } from './state.js'
import type { z } from './zod.js'

export function builder(
	context: Context,
	options: RequiredPick<cli.Options, 'config'> | RequiredPick<cli.Options, 'keywords'>
): cli.Builder & cli.Executable
export function builder(context: Context, options: cli.Options): cli.Builder
export function builder(context: Context, options: cli.Options): cli.Builder & cli.Executable {
	// set `clibuilder-debug` logs manually to logLevels.all,
	// as user can run `config()` to set the log levels
	// and override the log level for this logger.
	// context.ui.displayLevel = 'trace'
	const s = state(options)
	const description = s.description
	const pending: Promise<any>[] = []
	const registry = createRegistry()
	const loadingConfig = s.configName ? context.loadConfig(s.configName) : undefined
	const mayAcceptPlugins = s.configName || s.keywords.length > 0
	if (mayAcceptPlugins) s.command.commands.push(adjustCommand(s.command, pluginsCommand))

	if (loadingConfig) {
		pending.push(
			(async () => {
				const config = await loadingConfig
				s.config = config
				if (config?.plugins) {
					const commands = await context.loadPlugins(config.plugins, registry, {
						name: s.name,
						version: s.version || ''
					})
					s.command.commands.push(...commands.map((c) => adjustCommand(s.command, c)))
				}
			})()
		)
	}
	return {
		name: s.name,
		version: s.version || '',
		description,
		parse: (mayAcceptPlugins ? parse : undefined) as any,
		default(command) {
			s.command = adjustCommand(s.command, { ...s.command, ...command })
			delete (this as any)['default']
			return { ...this, parse }
		},
		command(command) {
			s.command.commands.push(adjustCommand(s.command, command))
			return { ...this, parse }
		}
	}

	async function parse(argv: string[]) {
		await Promise.all(pending)
		context.ui.debug('argv:', argv.join(' '))
		const rawArgs = parseArgv(argv)
		const baseCommand = getBaseCommand(s.description, { config: !!s.configName })
		const { args: baseArgs } = lookupCommand(baseCommand, rawArgs)
		if (baseArgs.silent) {
			delete rawArgs.silent
			s.displayLevel = 'none'
		}
		if (baseArgs.verbose) {
			delete rawArgs.verbose
			s.displayLevel = 'debug'
		}
		if (baseArgs['debug-cli']) {
			delete rawArgs['debug-cli']
			s.displayLevel = 'trace'
		}
		context.ui.displayLevel = s.displayLevel
		context.ui.dump()

		if (s.configName && baseArgs['show-config']) return showConfig(s.configName)

		const r = lookupCommand(s.command, rawArgs)
		const { args, command } = r

		if (baseArgs.version || args.version) return createCommandInstance(context, s, r.command, registry).ui.showVersion()
		// `--help` is answered before the errors are reported: it is the one flag
		// that is always valid, and asking for help is not a usage error.
		if (baseArgs.help || args.help) return createCommandInstance(context, s, r.command, registry).ui.showHelp()

		// the global options live on the base command, so a sub command that declares
		// no options of its own reports them as unknown. They are always accepted.
		const errors = r.errors.filter((e) => !(e.type === 'invalid-key' && !!lookupOptions(baseCommand, e.key)[0]))
		if (errors.length > 0) {
			const ui = createCommandInstance(context, s, r.command, registry).ui
			for (const e of errors) ui.error(formatLookupError(e, command))
			ui.showHelp()
			return context.exit(exitCodes.usage)
		}

		if (command.config) {
			const configName = typeof s.configName === 'string' ? s.configName : s.name
			const { config, errors } = parseConfig(command.config, await context.loadConfig(configName))
			s.config = config

			if (errors) {
				context.ui.error('config fails validation:')
				forEachKey(errors, (k) => context.ui.error(`  ${String(k)}: ${errors[k]}`))
				createCommandInstance(context, s, r.command, registry).ui.showHelp()
				return context.exit(exitCodes.error)
			}
			s.config = config
		}
		const commandInstance = createCommandInstance(context, s, command, registry)
		if (!commandInstance.run) return commandInstance.ui.showHelp()
		try {
			return await commandInstance.run(args as any)
		} catch (e) {
			// a command signals failure by throwing `CliError`. Anything else is a
			// defect in the command and keeps propagating to the caller.
			if (!isCliError(e)) throw e
			commandInstance.ui.error(e.message)
			for (const h of e.help) commandInstance.ui.error(h)
			return context.exit(e.exitCode)
		}
	}

	/**
	 * Reports the resolved config and its provenance.
	 *
	 * The resolution itself is `context.resolveConfig`, the same call the cli
	 * already makes to load its config, so this reports what the cli actually
	 * uses rather than re-deriving it.
	 */
	async function showConfig(configName: string) {
		const { config, source } = await context.resolveConfig(configName)
		const ui = createCommandUI(context, s, s.command)
		ui.info(`config: ${describeConfigSource(source)}`)
		if (source.type !== 'none') ui.info(JSON.stringify(config, undefined, 2))
	}

	function parseConfig(configType: z.ZodTypeAny, config: any) {
		const r = configType.safeParse(config)
		if (r.success) {
			return { config }
		}
		const errors = r.error.flatten().fieldErrors
		return { errors }
	}
}

function createCommandInstance(
	ctx: Context,
	state: state.Result,
	command: cli.Command,
	registry: ReturnType<typeof createRegistry>
) {
	return {
		...command,
		run: (command as any).run,
		ui: createCommandUI(ctx, state, command),
		config: state.config,
		keywords: state.keywords,
		cwd: ctx.cwd,
		registry
	}
}

function createCommandUI(ctx: Context, state: state.Result, command: cli.Command) {
	const ui = ctx.createCommandUI(command.name || state.name)
	ui.displayLevel = state.displayLevel
	// istanbul ignore next
	return {
		...ui,
		showVersion: () => ui.showVersion(state.version),
		showHelp: () => ui.showHelp(state.name, command)
	}
}

function adjustCommand<C extends Command>(base: Command, command: C): C {
	if (command.name) {
		command.parent = base
	}
	if (command.commands) {
		command.commands = command.commands.map((c) => adjustCommand(command, c))
	}
	return command
}
