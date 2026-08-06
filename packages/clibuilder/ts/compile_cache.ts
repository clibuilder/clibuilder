import module from 'node:module'

export const ctx = {
	enableCompileCache: module.enableCompileCache?.bind(module),
	compileCacheStatus: module.constants?.compileCacheStatus,
	env: process.env
}

export namespace enableCompileCache {
	export type Result = {
		/**
		 * `true` when the V8 compile cache is active for the rest of this process.
		 */
		enabled: boolean
		/**
		 * Directory the cache is stored in, when enabled.
		 */
		directory?: string
		/**
		 * Why the cache could not be enabled.
		 */
		message?: string
	}
}

/**
 * Turns on Node's V8 compile cache for the rest of this process.
 *
 * Call this as the *first* statement of your cli's bin script, before the modules
 * you want cached are loaded. It caches nothing that is already compiled, so calling
 * it after `import 'clibuilder'` (or from inside `cli()`) is a no-op.
 *
 * Import it from `clibuilder/compile-cache` — that subpath pulls in nothing but
 * `node:module`, so reaching it costs no startup time.
 *
 * ```js
 * // esm bin — the dynamic import keeps your cli out of the statically linked graph
 * import { enableCompileCache } from 'clibuilder/compile-cache'
 * enableCompileCache()
 * const { cli } = await import('clibuilder')
 * ```
 *
 * ```js
 * // cjs bin
 * require('clibuilder/compile-cache').enableCompileCache()
 * const { cli } = require('clibuilder')
 * ```
 *
 * Never throws. On runtimes without the API (Node < 22.1, and current bun/deno) it
 * reports `enabled: false` and leaves the process untouched.
 *
 * @param cacheDir Where to store the cache. Defaults to Node's own location.
 * Ignored when the user has set `NODE_COMPILE_CACHE` — their choice wins.
 */
export function enableCompileCache(cacheDir?: string): enableCompileCache.Result {
	if (!ctx.enableCompileCache) {
		return { enabled: false, message: 'module.enableCompileCache() is not available on this runtime' }
	}
	// the user already picked a directory through the environment. Let node use it.
	const dir = ctx.env['NODE_COMPILE_CACHE'] ? undefined : cacheDir
	try {
		const result = ctx.enableCompileCache(dir)
		const status = ctx.compileCacheStatus
		const enabled = status
			? result.status === status.ENABLED || result.status === status.ALREADY_ENABLED
			: !!result.directory
		return enabled
			? { enabled, directory: result.directory }
			: { enabled, directory: result.directory, message: result.message }
	} catch (e: any) {
		return { enabled: false, message: e?.message ?? String(e) }
	}
}
