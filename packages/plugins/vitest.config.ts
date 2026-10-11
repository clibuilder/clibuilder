import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		include: ['src/**/*.spec.ts'],
		coverage: {
			provider: 'istanbul',
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.spec.ts'],
			reporter: ['text', 'json', 'lcov', 'clover']
		}
	}
})
