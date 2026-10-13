/**
 * How `runScript()` renders a `ref()`: from the command map `universal-plugin plugin build` embeds in each
 * compiled skill script (cyberuni/universal-plugin#177; next-step-refs RFC section 5).
 */

import { existsSync, realpathSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import { type Ref, type RefResolver, refArgs, shellQuote } from '../render/ref.js'

/**
 * The data a compiled skill script carries in `globalThis.__SKILL_SCRIPT__`.
 * The field names are universal-plugin's; clibuilder declares its own copy and does not depend on it.
 */
export type ScriptData = {
	/** The npm package that ships the plugin, for the pinned `npx` fallback. */
	package: string | null
	/** The package's bin name, for `pnpm exec <bin>`. */
	bin: string | null
	/** The plugin version the `npx` fallback pins. */
	version: string | null
	/** This script's own path, relative to the plugin root. */
	entry: string
	/** Command path to the script that runs it, relative to the plugin root. */
	commands: Record<string, string>
}

export const scriptGlobal = '__SKILL_SCRIPT__'

/** The script data from the global, or `undefined` when there is none or its shape is not one this copy reads. */
export function readScriptData(value: unknown = (globalThis as any)[scriptGlobal]): ScriptData | undefined {
	if (typeof value !== 'object' || value === null) return undefined
	const { package: pkg, bin, version, entry, commands } = value as Record<string, unknown>
	const nullableString = (v: unknown) => v === null || typeof v === 'string'
	if (!nullableString(pkg) || !nullableString(bin) || !nullableString(version)) return undefined
	if (typeof entry !== 'string' || typeof commands !== 'object' || commands === null) return undefined
	return value as ScriptData
}

/**
 * Renders a ref as, in order: the sibling script (`node <real path>`), the installed cli (`pnpm exec <bin>`),
 * or the pinned package (`npx <package>@<version>`). Without script data a ref is not rendered.
 */
export function scriptResolver(
	data: ScriptData | undefined,
	{ script = process.argv[1], cwd = process.cwd() }: { script?: string | undefined; cwd?: string } = {}
): RefResolver {
	let root: string | undefined | null = null
	return (ref: Ref) => {
		if (!data) return undefined
		const args = refArgs(ref)
		const target = data.commands[ref.path]
		if (target !== undefined) {
			root ??= pluginRoot(script, data.entry)
			if (root !== undefined) return ['node', shellQuote(join(root, target)), ...args].join(' ')
		}
		if (data.bin && installed(cwd, data.bin)) return ['pnpm', 'exec', data.bin, ref.path, ...args].join(' ')
		if (data.package && data.version) return ['npx', `${data.package}@${data.version}`, ref.path, ...args].join(' ')
		return undefined
	}
}

// the real path of the running script, minus its `entry`, so the line works through a pnpm link, a copy or a cache
function pluginRoot(script: string | undefined, entry: string) {
	if (!script) return undefined
	try {
		const self = realpathSync(script)
		const tail = join(entry)
		if (!self.endsWith(sep + tail)) return undefined
		return self.slice(0, -tail.length - 1)
	} catch {
		return undefined
	}
}

function installed(cwd: string, bin: string) {
	for (let dir = cwd; ; dir = dirname(dir)) {
		if (existsSync(join(dir, 'node_modules', '.bin', bin))) return true
		if (dirname(dir) === dir) return false
	}
}
