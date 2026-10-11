import { getBaseCommand, yieldToGlobalFormat } from '../builtin/base_command.js'
import type { cli, Extension, ExtensionContext } from '../cli.js'
import type { Command } from '../command/internal.js'
import { type ConfigSource, describeConfigSource } from '../config.js'
import type { UI } from '../core/ports.js'
import type { Context } from '../drivers/context.js'
import { parseArgv } from '../invocation/argv.js'
import { convertDescriptors, peekFlags } from '../invocation/descriptors.js'
import { lookupCommand } from '../invocation/lookup.js'
import { createRegistry } from '../plugins/registry.js'
import { answerValue, printAnswer } from '../render/answer.js'
import { type ErrorFields, encode, errorOutput, formats } from '../render/encode.js'
import { formatLookupError } from '../render/error.js'
import { generateHelpMessage, generateHelpModel } from '../render/help.js'
import {
	describeInvalidConfig,
	describeMissingCommand,
	describeUsageError,
	topUsageError
} from '../render/usage_error.js'
import type { StandardSchemaV1 } from '../t.js'
import type { RequiredPick } from '../type_utils.js'
import { type CliError, exitCodes, isCliError, isReportedCliError } from './errors.js'
import { state } from './state.js'
import { resolveGlobalOptions, resolveUsageErrors } from './usage_errors.js'

export function builder(context: Context, options: RequiredPick<cli.Options, 'config'>): cli.Builder & cli.Executable
export function builder(context: Context, options: cli.Options): cli.Builder
export function builder(context: Context, options: cli.Options): cli.Builder & cli.Executable {
	// set `clibuilder-debug` logs manually to logLevels.all,
	// as user can run `config()` to set the log levels
	// and override the log level for this logger.
	// context.ui.displayLevel = 'trace'
	const s = state(options)
	const format = options.format ?? 'toon'
	const output = options.output ?? 'axi'
	if (!formats.includes(format)) {
		throw new TypeError(`cli({ format }) must be one of ${formats.join(', ')}, received ${String(format)}`)
	}
	const description = s.description
	const pending: Promise<any>[] = []
	const registry = createRegistry()
	const extensions: Extension[] = []
	let extending: Promise<void> | undefined
	// whether an extension read the config, and so took charge of a `plugins` key in it
	let configRead = false
	const loadingConfig = s.configName ? context.loadConfig(s.configName) : undefined

	if (loadingConfig) {
		pending.push(
			(async () => {
				s.config = await loadingConfig
			})()
		)
	}
	return {
		name: s.name,
		version: s.version || '',
		description,
		// a cli with config is executable on its own: `--show-config` and `--help` need no command
		parse: (s.configName ? parse : undefined) as any,
		default(command) {
			s.command = adjust(s.command, { ...s.command, ...command })
			delete (this as any)['default']
			return { ...this, parse }
		},
		command(command) {
			s.command.commands.push(adjust(s.command, command))
			return { ...this, parse }
		},
		use(extension) {
			extensions.push(extension)
			return { ...this, parse }
		}
	}

	/**
	 * Runs every `use()` extension in the order it was added, each awaited before the next.
	 *
	 * Runs once, on the first `parse()` that needs the command tree.
	 */
	function extend() {
		return (extending ??= (async () => {
			const extensionContext: ExtensionContext = {
				host: { name: s.name, version: s.version || '' },
				cwd: context.cwd,
				ui: createExtensionUI(context, s),
				registry,
				addCommand(command) {
					s.command.commands.push(adjust(s.command, command as Command))
				},
				async resolveConfig() {
					configRead = true
					if (!s.configName) return { config: undefined, source: { type: 'none' }, candidates: [] }
					return context.resolveConfig(s.configName)
				}
			}
			for (const extension of extensions) await extension(extensionContext)
			warnUnloadedPlugins()
		})())
	}

	/**
	 * Warns once when the config names plugins that nothing loads.
	 *
	 * clibuilder 11 loaded them itself. In 12 that moved to `@clibuilder/plugins`,
	 * and without this warning the plugins would silently stop loading (slim-dependencies RFC section 9.8).
	 * An extension that read the config is taken to handle its `plugins` key.
	 */
	function warnUnloadedPlugins() {
		if (configRead || !Array.isArray(s.config?.plugins) || s.config.plugins.length === 0) return
		context.ui.warn(
			'the config lists plugins, but this cli loads none. ' +
				'Plugin loading moved out of clibuilder 12 into @clibuilder/plugins: add .use(plugins()) to the cli.'
		)
	}

	async function parse(argv: string[]) {
		if (isBareVersion(argv)) {
			// answered before the pending config and the `use()` extensions,
			// so a broken config or a hanging extension cannot fail or delay it.
			// The config load is not awaited, so a rejection from it is marked handled here
			// instead of crashing the process.
			for (const p of pending) p.catch(() => {})
			// the exit code is left unset, so the process exits 0, and parse resolves to
			// `undefined` as it does when the version is answered on the normal path.
			context.writeStdout(`${s.version || 'not versioned'}\n`)
			return
		}
		await Promise.all(pending)
		context.ui.debug('argv:', argv.join(' '))
		const rawArgs = parseArgv(argv)
		const baseCommand = getBaseCommand(s.description, { config: !!s.configName, format })
		// the global options are read from the base command alone, before the matched
		// command's usage errors are looked at (axi-native RFC section 3.2).
		// A bad `--format` falls back to the `cli({ format })` default, so its usage error is reported in that.
		const globals = resolveGlobalOptions(baseCommand, rawArgs, format)
		if (globals.silent) {
			delete rawArgs.silent
			s.displayLevel = 'none'
		}
		if (globals.verbose) {
			delete rawArgs.verbose
			s.displayLevel = 'debug'
		}
		if (globals['debug-cli']) {
			delete rawArgs['debug-cli']
			s.displayLevel = 'trace'
		}
		context.ui.displayLevel = s.displayLevel
		context.ui.dump()

		if (s.configName && globals['show-config']) return showConfig(s.configName, globals.format)

		await extend()

		const r = lookupCommand(s.command, rawArgs, baseCommand)
		const { args, command } = r
		// a command's own `help` or `version` flag, read before the other declarations are converted
		const flags = peekFlags(r, ['help', 'version'])

		if (globals.version || flags.version) {
			if (output === 'axi') return writeVersion()
			return createCommandInstance(context, s, r.command, registry).ui.showVersion()
		}
		// `--help` is answered before the errors are reported: it is the one flag
		// that is always valid, and asking for help is not a usage error.
		if (globals.help || flags.help) {
			if (output === 'axi') return writeHelp(r.command, baseCommand, globals.format)
			return createCommandInstance(context, s, r.command, registry).ui.showHelp()
		}

		// the declarations are converted and checked by `args-minus`, which may await a converter or a check,
		// so it runs after `--help` and `--version` are answered
		await convertDescriptors(r)

		// the global options live on the base command, so its errors win for a global key:
		// a well-formed global flag is not unknown under a sub command,
		// and a malformed one is reported as the base command reports it (#614).
		const errors = resolveUsageErrors(r.errors, command, baseCommand, globals)
		if (errors.length > 0) {
			const ui = createCommandInstance(context, s, r.command, registry).ui
			const onUsageError = findUsageErrorHandler(command) ?? options.onUsageError
			if (onUsageError) {
				const code = await onUsageError(errors, { command, ui, format: globals.format, exitCode: exitCodes.usage })
				return exit(typeof code === 'number' ? code : exitCodes.usage)
			}
			if (output === 'axi') {
				// the top-ranked error alone, coded, on stdout, and no help dump (axi-native RFC section 3.3)
				writeReport(describeUsageError(topUsageError(errors)!, command, s.name), globals.format)
				return exit(exitCodes.usage)
			}
			for (const e of errors) ui.error(formatLookupError(e, command))
			ui.showHelp()
			return exit(exitCodes.usage)
		}

		if (command.config) {
			const configName = typeof s.configName === 'string' ? s.configName : s.name
			const { config, errors } = await parseConfig(command.config, await context.loadConfig(configName))
			s.config = config

			if (errors) {
				if (output === 'axi') {
					writeReport(describeInvalidConfig(errors), globals.format)
					return exit(exitCodes.error)
				}
				context.ui.error('config fails validation:')
				for (const k of Object.keys(errors)) context.ui.error(`  ${k}: ${errors[k]}`)
				createCommandInstance(context, s, r.command, registry).ui.showHelp()
				return exit(exitCodes.error)
			}
			s.config = config
		}
		const commandInstance = createCommandInstance(context, s, command, registry, globals.format, output)
		if (!commandInstance.run) {
			// a command without `run` is a group: invoked bare, it is missing its
			// sub command, so it is a usage error (#609). `--help` is handled above.
			if (output === 'axi') writeReport(describeMissingCommand(command, s.name), globals.format)
			else commandInstance.ui.showHelp()
			return exit(exitCodes.usage)
		}
		if (output === 'axi') {
			// a command that shows its own help or version answers like `--help` and `--version` (axi-native RFC section 3.7)
			commandInstance.ui.showHelp = () => writeHelp(command, baseCommand, globals.format)
			commandInstance.ui.showVersion = () => writeVersion()
		}
		try {
			return answer(await commandInstance.run(args as any), globals.format)
		} catch (e) {
			// a command signals failure by throwing `CliError`. Anything else is a
			// defect in the command and keeps propagating to the caller.
			if (!isCliError(e)) throw e
			reportCliError(e, globals.format, commandInstance.ui)
			return exit(e.exitCode)
		}
	}

	/**
	 * Reports the resolved config and its provenance.
	 *
	 * The resolution itself is `context.resolveConfig`, the same call the cli
	 * already makes to load its config, so this reports what the cli actually
	 * uses rather than re-deriving it.
	 *
	 * In `axi` output it is an answer on stdout, whatever the display level: `text` is the
	 * `console` rendering, and `toon` and `json` encode the source and the config.
	 * In `console` output it is written through `ui.info`, as before.
	 */
	async function showConfig(configName: string, format: cli.Format) {
		const { config, source } = await context.resolveConfig(configName)
		const lines = [`config: ${describeConfigSource(source)}`]
		if (source.type !== 'none') lines.push(JSON.stringify(config, undefined, 2))
		if (output === 'axi') {
			context.writeStdout(
				format === 'text' ? `${lines.join('\n')}\n` : `${encode(configReport(source, config), format)}\n`
			)
			return
		}
		const ui = createCommandUI(context, s, s.command)
		for (const line of lines) ui.info(line)
	}

	/**
	 * Reports a `CliError` once: as an encoded answer on stdout in `axi` output, with a debugging copy
	 * as a `debug` line, or as its message and help lines through `ui.error` in `console` output.
	 * One from `CliError.reported()` was already reported, so nothing is written for it.
	 */
	function reportCliError(
		e: CliError,
		format: cli.Format,
		ui: { error(...args: any[]): void; debug(...args: any[]): void }
	) {
		if (isReportedCliError(e)) return
		if (output === 'axi') {
			// read field by field: a `CliError` from an older copy of clibuilder has no `code` or `details`
			const report = errorOutput({ message: e.message, code: e.code ?? 'error', details: e.details, help: e.help })
			context.writeStdout(`${encode(report, format)}\n`)
			ui.debug(e)
			return
		}
		ui.error(e.message)
		for (const h of e.help) ui.error(h)
	}

	/**
	 * Writes a report as an encoded answer on stdout, in `axi` output.
	 */
	function writeReport(report: ErrorFields, format: cli.Format) {
		context.writeStdout(`${encode(errorOutput(report), format)}\n`)
	}

	/**
	 * Prints what `run()` returned, once, as the answer on stdout in `axi` output (axi-native RFC section 3.5).
	 * In `console` output nothing is printed, as before.
	 * Either way `parse()` resolves to the value: the one `result()`, `document()` or `empty()` wraps, else the returned value.
	 */
	function answer(returned: unknown, format: cli.Format) {
		if (output === 'axi') {
			const text = printAnswer(returned, format)
			if (text !== undefined) context.writeStdout(text)
		}
		return answerValue(returned)
	}

	/**
	 * Answers `--help` in `axi` output: on stdout, whatever the display level.
	 * `text` is the text help, unchanged; `toon` and `json` encode the structured help it is rendered from.
	 */
	function writeHelp(command: Command, baseCommand: Command, format: cli.Format) {
		context.writeStdout(
			format === 'text'
				? `${generateHelpMessage(s.name, command)}\n`
				: `${encode(generateHelpModel(s.name, command, baseCommand.options!), format)}\n`
		)
	}

	/**
	 * Answers `--version` in `axi` output: plain text on stdout in every format, as the bare fast path does.
	 */
	function writeVersion() {
		context.writeStdout(`${s.version || 'not versioned'}\n`)
	}

	function exit(code: number) {
		context.exit(code)
		return code
	}

	function adjust<C extends Command>(base: Command, command: C): C {
		return adjustCommand(base, command)
	}
}

/**
 * Validates the loaded config against the command's `config` schema.
 *
 * The schema's output is what the command gets, so its defaults and transforms apply.
 * A failure is reported as the messages for each config key.
 *
 * With no config, a schema that rejects `undefined` validates `{}` instead,
 * so a schema whose keys all have defaults passes, and one with a required key names that key.
 */
async function parseConfig(
	schema: cli.ConfigSchema,
	config: unknown
): Promise<{ config: unknown; errors?: undefined } | { config?: undefined; errors: ConfigErrors }> {
	let r = await schema['~standard'].validate(config)
	if (r.issues && config === undefined) r = await schema['~standard'].validate({})
	if (!r.issues) return { config: r.value }
	return { errors: toConfigErrors(r.issues) }
}

/**
 * The messages for each config key, keyed by the dotted path of the value that failed.
 */
type ConfigErrors = Record<string, string[] | undefined>

/**
 * Maps a Standard Schema's issues to the messages for each key, with the key read from each issue's path.
 * An issue without a path is about the config as a whole and is keyed `(config)`.
 */
function toConfigErrors(issues: readonly StandardSchemaV1.Issue[]): ConfigErrors {
	const errors: ConfigErrors = {}
	for (const issue of issues) {
		const key = issue.path?.length
			? issue.path.map((p) => String(typeof p === 'object' ? p.key : p)).join('.')
			: '(config)'
		;(errors[key] ??= []).push(String(issue.message))
	}
	return errors
}

/**
 * The resolved config as a value: where it came from, then the config itself.
 * `path` and `property` are present only for the sources that have them,
 * and `config` is `null` when nothing matched.
 */
function configReport(source: ConfigSource, config: unknown) {
	switch (source.type) {
		case 'file':
			return { source: source.type, path: source.path, config: config ?? null }
		case 'package.json':
			return { source: source.type, path: source.path, property: source.property, config: config ?? null }
		default:
			return { source: source.type, config: null }
	}
}

/**
 * Whether the only token after the binary is `--version` or `-v`.
 *
 * Anything else, `cli <cmd> --version` included, needs the command tree,
 * because a sub-command may declare `-v` or `--version` as its own option.
 * Nothing is loaded when the bare form is answered, so a bare `-v` is the version
 * even if an extension or the config declares `-v`.
 */
function isBareVersion(argv: string[]) {
	const tokens = argv.slice(2)
	return tokens.length === 1 && (tokens[0] === '--version' || tokens[0] === '-v')
}

/**
 * The ui an extension logs through: the framework's own,
 * so its messages follow `--silent`, `--verbose` and `--debug-cli` like the framework's do.
 */
function createExtensionUI(ctx: Context, state: state.Result): UI {
	const ui = ctx.ui
	return {
		get displayLevel() {
			return ui.displayLevel
		},
		set displayLevel(level) {
			ui.displayLevel = level
		},
		info: (...args) => ui.info(...args),
		warn: (...args) => ui.warn(...args),
		error: (...args) => ui.error(...args),
		debug: (...args) => ui.debug(...args),
		showHelp: () => ui.showHelp(state.name, state.command),
		showVersion: () => ui.showVersion(state.version)
	}
}

/**
 * The matched command's own usage-error handler, else the nearest enclosing command's.
 */
function findUsageErrorHandler(command: Command | undefined): cli.UsageErrorHandler | undefined {
	for (let c = command; c; c = c.parent) {
		if (c.onUsageError) return c.onUsageError
	}
}

function createCommandInstance(
	ctx: Context,
	state: state.Result,
	command: cli.Command,
	registry: ReturnType<typeof createRegistry>,
	format: cli.Format = 'toon',
	output: cli.Output = 'axi'
) {
	return {
		...command,
		run: (command as any).run,
		ui: createCommandUI(ctx, state, command),
		format,
		output,
		config: state.config,
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

/**
 * Links a command and its sub-commands to their parents.
 *
 * A command's own `format` option gives way to the global `--format`, on a copy of the command,
 * or fails the cli (see `yieldToGlobalFormat()`).
 */
function adjustCommand<C extends Command>(base: Command, command: C): C {
	command = yieldToGlobalFormat(command)
	if (command.name) {
		command.parent = base
	}
	if (command.commands) {
		command.commands = command.commands.map((c) => adjustCommand(command, c))
	}
	return command
}
