import ts from 'typescript'
import { applyEdits, FileContext, type Finding } from './context.js'
import { importsClibuilder } from './imports.js'
import {
	auditReturns,
	flagFormatOption,
	flagKeywords,
	flagShowHelp,
	moveSubpathImports,
	reportSubpathImports,
	transformAxiImports,
	transformConfig,
	transformPlugins
} from './rules.js'
import { transformZod } from './zod.js'

export namespace transform {
	export type Options = {
		/**
		 * Add `.use(plugins())` to a `cli()` that sets `config`, instead of flagging it.
		 * Use it when the CLI loads plugins from its config.
		 */
		readonly addPlugins?: boolean | undefined
	}

	export type Result = {
		readonly output: string
		readonly findings: readonly Finding[]
		/** Packages the output imports that the file's `package.json` must list. */
		readonly dependencies: readonly string[]
	}
}

/**
 * Upgrades one source file from clibuilder 11 to clibuilder 12.
 *
 * A file that imports nothing from `clibuilder` or `@clibuilder/*` is returned unchanged.
 */
export function transform(source: string, fileName: string, options: transform.Options = {}): transform.Result {
	if (!source.includes('clibuilder')) return { output: source, findings: [], dependencies: [] }
	const sourceFile = parse(source, fileName)
	if (!importsClibuilder(sourceFile)) return { output: source, findings: [], dependencies: [] }

	const context = new FileContext(sourceFile, source)
	transformZod(context)
	transformAxiImports(context)
	transformPlugins(context, { addPlugins: options.addPlugins ?? false })
	transformConfig(context)
	flagKeywords(context)
	flagFormatOption(context)
	flagShowHelp(context)
	auditReturns(context)
	reportSubpathImports(context)

	const output = applyEdits(source, context.allEdits())
	const subpaths = new FileContext(parse(output, fileName), output)
	moveSubpathImports(subpaths)

	const findings = [...context.findings].sort((a, b) => a.line - b.line || a.column - b.column)
	return {
		output: applyEdits(output, subpaths.allEdits()),
		findings,
		dependencies: [...context.dependencies]
	}
}

function parse(source: string, fileName: string) {
	return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKind(fileName))
}

function scriptKind(fileName: string) {
	if (/\.[cm]?tsx$/.test(fileName)) return ts.ScriptKind.TSX
	if (/\.jsx$/.test(fileName)) return ts.ScriptKind.JSX
	if (/\.[cm]?js$/.test(fileName)) return ts.ScriptKind.JS
	return ts.ScriptKind.TS
}
