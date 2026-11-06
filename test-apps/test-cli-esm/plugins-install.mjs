// The example of the plugin directory guide (#565): the built-in `plugins` group from
// `@clibuilder/plugins`, with an `install` sub-command the cli adds to it.
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pluginsCommand } from '@clibuilder/plugins'
import { CliError, command, exitCodes, ref, result } from 'clibuilder'
import { lookupConfig } from 'clibuilder/config'

/**
 * The `plugins` group with `list`, `search` and `install`.
 *
 * Add it with `.command()` and pass `plugins({ command: false })`, so the cli has one `plugins` group.
 */
export function pluginsGroup({ name, keywords }) {
	const builtin = pluginsCommand({ keywords })
	return command({ ...builtin, commands: [...builtin.commands, installPluginCommand(name)] })
}

/**
 * `plugins install <plugin>`: installs the package with the project's package manager,
 * then says what to add to the config. It does not write the config.
 *
 * @param {string} cliName the name the cli's config file is looked up by
 */
export function installPluginCommand(cliName) {
	return command({
		name: 'install',
		description: "Install a plugin with the project's package manager",
		arguments: [{ name: 'plugin', description: 'the plugin package, with an optional @version' }],
		context: { detectPackageManager, runPackageManager, findConfig: (cwd) => lookupConfig({ cwd }, cliName).source },
		async run({ plugin }) {
			const name = packageName(plugin)
			const packageManager = this.context.detectPackageManager(this.cwd)
			const code = await this.context.runPackageManager(packageManager, ['add', plugin], this.cwd)
			if (code !== 0) {
				throw new CliError(`${packageManager} add ${plugin} failed with exit code ${code}`, {
					code: 'install-failed',
					details: { plugin, packageManager },
					help: `Run \`${packageManager} add ${plugin}\` to see the full error`
				})
			}
			const configured = Array.isArray(this.config?.plugins) ? this.config.plugins : []
			if (configured.includes(name)) {
				return result(
					{ installed: name, packageManager, config: 'already lists it' },
					{ help: [ref('plugins list', {}, 'see the installed plugins')] }
				)
			}
			const source = this.context.findConfig(this.cwd)
			const plugins = [...configured, name]
			return result(
				{ installed: name, packageManager, config: describeConfig(source, cliName), plugins },
				{ help: addToConfig(source, cliName, name, plugins) }
			)
		}
	})
}

/**
 * The package name of a `name@version` spec, which is the name the config lists.
 * Rejects a spec the package manager would read as a flag, or a shell would expand.
 */
function packageName(spec) {
	const match = /^((?:@[a-z0-9][\w.~-]*\/)?[a-z0-9][\w.~-]*)(?:@[\w.^~*+-]+)?$/i.exec(spec)
	if (match) return match[1]
	throw new CliError(`not a package name: ${spec}`, {
		code: 'invalid-value',
		exitCode: exitCodes.usage,
		details: { plugin: spec },
		help: ref('plugins search', {}, 'see the plugin names')
	})
}

function describeConfig(source, cliName) {
	if (source.type === 'file') return source.path
	if (source.type === 'package.json') return `${source.path} (property "${source.property}")`
	return `none, create ${cliName}.json`
}

function addToConfig(source, cliName, name, plugins) {
	if (source.type === 'file') return `Add "${name}" to the \`plugins\` array in ${source.path} to load it`
	if (source.type === 'package.json') {
		return `Add "${name}" to \`${source.property}.plugins\` in ${source.path} to load it`
	}
	return `Create ${cliName}.json holding ${JSON.stringify({ plugins })} to load it`
}

/**
 * The package manager whose lockfile is in `cwd`, `npm` when there is none.
 * Each of them accepts `add <package>`.
 */
export function detectPackageManager(cwd) {
	const lockfiles = [
		['pnpm-lock.yaml', 'pnpm'],
		['yarn.lock', 'yarn'],
		['bun.lock', 'bun'],
		['bun.lockb', 'bun']
	]
	return lockfiles.find(([file]) => existsSync(join(cwd, file)))?.[1] ?? 'npm'
}

/**
 * Runs the package manager and resolves to its exit code.
 * Its output goes to stderr: stdout carries the command's answer.
 */
function runPackageManager(packageManager, args, cwd) {
	return new Promise((resolve, reject) => {
		const child = spawn(packageManager, args, {
			cwd,
			stdio: ['inherit', process.stderr, process.stderr],
			// `npm` is `npm.cmd` on Windows, which runs only through a shell; `packageName()` keeps the spec shell-safe
			shell: process.platform === 'win32'
		})
		child.on('error', (error) => {
			reject(
				new CliError(`cannot run ${packageManager}: ${error.message}`, {
					code: 'package-manager-not-found',
					details: { packageManager },
					help: `Install ${packageManager}, then run the command again`
				})
			)
		})
		child.on('close', (code) => resolve(code ?? 1))
	})
}
