import ts from 'typescript'
import type { FileContext } from './context.js'

export type NamedImport = {
	readonly declaration: ts.ImportDeclaration
	readonly specifier: ts.ImportSpecifier
	/** The name exported by the module. */
	readonly imported: string
	/** The name bound in the file. */
	readonly local: string
}

export function importsFrom(sourceFile: ts.SourceFile, moduleName: string) {
	return sourceFile.statements.filter(
		(s): s is ts.ImportDeclaration =>
			ts.isImportDeclaration(s) && ts.isStringLiteral(s.moduleSpecifier) && s.moduleSpecifier.text === moduleName
	)
}

export function namedImports(sourceFile: ts.SourceFile, moduleName: string): NamedImport[] {
	const result: NamedImport[] = []
	for (const declaration of importsFrom(sourceFile, moduleName)) {
		const bindings = declaration.importClause?.namedBindings
		if (!bindings || !ts.isNamedImports(bindings)) continue
		for (const specifier of bindings.elements) {
			result.push({
				declaration,
				specifier,
				imported: (specifier.propertyName ?? specifier.name).text,
				local: specifier.name.text
			})
		}
	}
	return result
}

/** Whether the file imports `clibuilder`, a subpath of it, or a `@clibuilder/*` package. */
export function importsClibuilder(sourceFile: ts.SourceFile) {
	return sourceFile.statements.some(
		(s) =>
			ts.isImportDeclaration(s) &&
			ts.isStringLiteral(s.moduleSpecifier) &&
			/^(clibuilder(\/.*)?|@clibuilder\/.+)$/.test(s.moduleSpecifier.text)
	)
}

/**
 * Rewrites the `{ … }` of an import declaration from a list of specifier texts.
 * An empty list removes the whole declaration, including its line break.
 */
export function replaceNamedImports(context: FileContext, declaration: ts.ImportDeclaration, specifiers: string[]) {
	const bindings = declaration.importClause?.namedBindings
	if (!bindings || !ts.isNamedImports(bindings)) return
	if (specifiers.length === 0 && !declaration.importClause?.name) {
		const start = declaration.getStart(context.sourceFile)
		const end = context.text[declaration.end] === '\n' ? declaration.end + 1 : declaration.end
		context.replace(start, end, '')
		return
	}
	context.replace(bindings.getStart(context.sourceFile), bindings.end, `{ ${specifiers.join(', ')} }`)
}

/** Adds `import { name } from 'moduleName'` on the line after `after`. */
export function addImportAfter(context: FileContext, after: ts.Statement, text: string) {
	context.replace(after.end, after.end, `\n${text}`)
}
