import { defineConfig } from 'vitest/config'

// Hand-written rather than a preset: the sources live in `src/`, and the suite
// uses the same `spec`/`unit` file identifiers the previous jest `testRegex` did.
export default defineConfig({
	test: {
		globals: true,
		include: ['src/**/*.{spec,unit}.ts'],
		coverage: {
			provider: 'istanbul',
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.{spec,unit}.ts'],
			reporter: ['text', 'json', 'lcov', 'clover']
		}
	}
})
