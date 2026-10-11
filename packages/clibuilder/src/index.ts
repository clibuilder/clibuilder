import { testCommand as testCommandFn } from './testing/test_command.js'

export { CliError, exitCodes, isCliError } from './app/errors.js'
export * from './cli.js'
export * from './command/define.js'
export {
	type ConfigFormat,
	type ConfigLoadResult,
	type ConfigLookupResult,
	type ConfigSource,
	describeConfigSource,
	getConfigFilenames,
	getConfigFormat,
	loadConfig,
	lookupConfig,
	readConfigFile,
	resolveConfig
} from './config.js'
export type { DisplayLevel, UI } from './core/ports.js'
export * from './invocation/argv.js'
export * from './plugins/registry.js'
export * from './t.js'
export {
	isZodArray,
	isZodBoolean,
	isZodEnum,
	isZodNumber,
	isZodObject,
	isZodOptional,
	isZodString,
	z
} from './zod.js'

/**
 * Runs a command in isolation.
 *
 * @deprecated import `testCommand` from `clibuilder/testing` instead.
 * The root export is removed in clibuilder 12.
 */
export const testCommand: typeof testCommandFn = testCommandFn
