import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		include: ['ts/**/*.spec.ts'],
		coverage: {
			provider: 'istanbul',
			include: ['ts/**/*.ts'],
			exclude: ['ts/**/*.spec.ts'],
			reporter: ['text', 'json', 'lcov', 'clover']
		}
	}
})
