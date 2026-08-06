import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ctx, enableCompileCache } from './compile_cache.js'

const original = { ...ctx }

afterEach(() => Object.assign(ctx, original))

function stub(stubs: Partial<typeof ctx>) {
	Object.assign(ctx, stubs)
}

const status = { FAILED: 0, ENABLED: 1, ALREADY_ENABLED: 2, DISABLED: 3 }

describe('enableCompileCache()', () => {
	it('reports not enabled on a runtime without the api', () => {
		stub({ enableCompileCache: undefined })
		expect(enableCompileCache()).toEqual({
			enabled: false,
			message: 'module.enableCompileCache() is not available on this runtime'
		})
	})

	it('does not throw when the api throws', () => {
		stub({
			enableCompileCache: () => {
				throw new Error('nope')
			}
		})
		expect(enableCompileCache()).toEqual({ enabled: false, message: 'nope' })
	})

	it('does not throw when the api throws a non-error', () => {
		stub({
			enableCompileCache: () => {
				throw 'nope'
			}
		})
		expect(enableCompileCache()).toEqual({ enabled: false, message: 'nope' })
	})

	it('falls back to the reported directory when the status constants are missing', () => {
		stub({
			enableCompileCache: () => ({ status: 1, directory: '/cache' }),
			compileCacheStatus: undefined,
			env: {}
		})
		expect(enableCompileCache()).toEqual({ enabled: true, directory: '/cache' })
	})

	it('reports the directory it enabled', () => {
		stub({
			enableCompileCache: () => ({ status: status.ENABLED, directory: '/cache' }),
			compileCacheStatus: status,
			env: {}
		})
		expect(enableCompileCache()).toEqual({ enabled: true, directory: '/cache' })
	})

	it('treats an already enabled cache as enabled', () => {
		stub({
			enableCompileCache: () => ({ status: status.ALREADY_ENABLED, directory: '/cache' }),
			compileCacheStatus: status,
			env: {}
		})
		expect(enableCompileCache().enabled).toBe(true)
	})

	it('reports why the cache could not be enabled', () => {
		stub({
			enableCompileCache: () => ({ status: status.FAILED, message: 'disk is full' }),
			compileCacheStatus: status,
			env: {}
		})
		expect(enableCompileCache()).toEqual({ enabled: false, message: 'disk is full' })
	})

	it('passes the cache dir to node', () => {
		let received: unknown
		stub({
			enableCompileCache: (dir) => {
				received = dir
				return { status: status.ENABLED, directory: String(dir) }
			},
			compileCacheStatus: status,
			env: {}
		})
		enableCompileCache('/my-cache')
		expect(received).toEqual('/my-cache')
	})

	it('leaves the cache dir to node when NODE_COMPILE_CACHE is set', () => {
		let received: unknown = '/not-called'
		stub({
			enableCompileCache: (dir) => {
				received = dir
				return { status: status.ALREADY_ENABLED, directory: '/from-env' }
			},
			compileCacheStatus: status,
			env: { NODE_COMPILE_CACHE: '/from-env' }
		})
		expect(enableCompileCache('/my-cache')).toEqual({ enabled: true, directory: '/from-env' })
		expect(received).toBeUndefined()
	})

	it('enables the cache of the running process', () => {
		const dir = mkdtempSync(path.join(tmpdir(), 'clibuilder-cc-'))
		const result = enableCompileCache(dir)
		// node >= 22.1 only. Elsewhere the call is a documented no-op.
		if (!result.enabled) return
		expect(result.directory).toBeTruthy()
	})
})
