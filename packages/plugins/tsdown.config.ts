import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: ['src/index.ts'],
	platform: 'node',
	target: 'node20.19',
	outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
	// one module per source file, as `tsc` used to emit, with the declarations beside them.
	format: 'esm',
	outDir: 'esm',
	unbundle: true,
	dts: { sourcemap: true }
})
