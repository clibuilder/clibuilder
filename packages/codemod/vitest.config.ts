import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		include: ['src/**/*.spec.ts'],
		coverage: {
			provider: 'istanbul',
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.spec.ts', 'src/bin.ts'],
			reporter: ['text', 'json', 'lcov', 'clover']
		}
	}
})
