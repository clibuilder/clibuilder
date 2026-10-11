import { writeFile } from 'node:fs/promises'
import { defineConfig } from 'tsdown'

const shared = {
	entry: ['src/index.ts'],
	platform: 'node',
	target: 'node20.19',
	outExtensions: () => ({ js: '.js', dts: '.d.ts' })
} as const

export default defineConfig([
	// one module per source file, as `tsc` used to emit, with the declarations beside them.
	{ ...shared, format: 'esm', outDir: 'esm', unbundle: true, dts: { sourcemap: true } },
	{
		...shared,
		format: 'cjs',
		outDir: 'cjs',
		dts: false,
		hooks: {
			// the package is `"type": "module"`, so `cjs/` needs its own marker to be read as CommonJS.
			'build:done': () => writeFile('cjs/package.json', '{ "type": "commonjs" }\n')
		}
	}
])
