import { defineConfig } from 'vitest/config'

// Hand-written rather than a preset: the sources live in `ts/`, and the suite
// uses the same `spec`/`unit` file identifiers the previous jest `testRegex` did.
export default defineConfig({
	test: {
		globals: true,
		include: ['ts/**/*.{spec,unit}.ts'],
		coverage: {
			provider: 'istanbul',
			include: ['ts/**/*.ts'],
			exclude: ['ts/**/*.{spec,unit}.ts'],
			reporter: ['text', 'json', 'lcov', 'clover']
		}
	}
})
