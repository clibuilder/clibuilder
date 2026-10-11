import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import * as root from './index.js'
import * as testing from './testing/index.js'
import { testCommand as testCommandFn } from './testing/test_command.js'

const srcDir = dirname(fileURLToPath(import.meta.url))

/**
 * The text of the `@deprecated` tag on each export of the entry at `file`,
 * or `undefined` when it has none.
 */
function deprecationsOf(file: string) {
	const program = ts.createProgram([file], {
		module: ts.ModuleKind.NodeNext,
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
		strict: true,
		noEmit: true
	})
	const checker = program.getTypeChecker()
	const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(file)!)!
	return Object.fromEntries(
		checker.getExportsOfModule(moduleSymbol).map((s) => {
			// an editor reports a re-export as deprecated when any link of its alias chain is,
			// so the chain is followed one link at a time
			for (let link: ts.Symbol | undefined = s; link; ) {
				const tag = link.getJsDocTags(checker).find((t) => t.name === 'deprecated')
				if (tag) return [s.name, ts.displayPartsToString(tag.text)]
				link = link.flags & ts.SymbolFlags.Alias ? checker.getImmediateAliasedSymbol(link) : undefined
			}
			return [s.name, undefined]
		})
	)
}

describe('deprecated exports', { timeout: 30_000 }, () => {
	const rootDeprecations = deprecationsOf(join(srcDir, 'index.ts'))

	it('no longer exports z, removed in v12 in favour of t', () => {
		expect('z' in root).toBe(false)
	})

	it('marks the root testCommand export @deprecated, pointing at clibuilder/testing', () => {
		expect(rootDeprecations.testCommand).toMatch(/`clibuilder\/testing`/)
	})

	it('leaves t and the clibuilder/testing testCommand undeprecated', () => {
		expect(rootDeprecations.t).toBeUndefined()
		expect(deprecationsOf(join(srcDir, 'testing/index.ts')).testCommand).toBeUndefined()
	})

	it('does not change what the deprecated exports are', () => {
		expect(root.testCommand).toBe(testCommandFn)
		expect(testing.testCommand).toBe(testCommandFn)
	})
})
