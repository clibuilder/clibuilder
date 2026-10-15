import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		include: ['src/**/*.spec.ts'],
		// loading a plugin imports it from disk; the first import is slow on Windows runners under coverage
		testTimeout: 15_000,
		coverage: {
			provider: 'istanbul',
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.spec.ts'],
			reporter: ['text', 'json', 'lcov', 'clover']
		}
	}
})
