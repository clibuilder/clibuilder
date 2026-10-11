import ts from 'typescript'
import type { FileContext } from './context.js'
import { addImportAfter, importsFrom, namedImports, replaceNamedImports } from './imports.js'

const COMMAND_KEYS = new Set(['run', 'name', 'description', 'arguments', 'commands'])

function propertyName(node: ts.ObjectLiteralElementLike | ts.ClassElement) {
	const name = node.name
	return name && (ts.isIdentifier(name) || ts.isStringLiteral(name)) ? name.text : undefined
}

function forEachNode(node: ts.Node, visit: (node: ts.Node) => void) {
	visit(node)
	ts.forEachChild(node, (child) => forEachNode(child, visit))
}

/**
 * A command's own `format` option conflicts with the global `--format`: a startup error in clibuilder 12.
 * axi-native RFC section 3.4.
 */
export function flagFormatOption(context: FileContext) {
	forEachNode(context.sourceFile, (node) => {
		if (!ts.isPropertyAssignment(node) || propertyName(node) !== 'options') return
		if (!ts.isObjectLiteralExpression(node.initializer) || !ts.isObjectLiteralExpression(node.parent)) return
		if (!node.parent.properties.some((p) => COMMAND_KEYS.has(propertyName(p) ?? ''))) return
		const format = node.initializer.properties.find((p) => propertyName(p) === 'format')
		if (!format) return
		context.flag(
			format,
			'format-option',
			'clibuilder 12 declares a global `--format <toon|json|text>`, and a command declaring its own `format` option is a startup error. Delete this option and read `this.format`.'
		)
	})
}

/**
 * `ui.showHelp()` and `ui.showVersion()` leave `ui` in clibuilder 12. axi-native RFC section 3.7.
 */
export function flagShowHelp(context: FileContext) {
	forEachNode(context.sourceFile, (node) => {
		if (!ts.isPropertyAccessExpression(node)) return
		const method = node.name.text
		if (method !== 'showHelp' && method !== 'showVersion') return
		const target = node.expression
		const isUi =
			(ts.isIdentifier(target) && target.text === 'ui') ||
			(ts.isPropertyAccessExpression(target) && target.name.text === 'ui')
		if (!isUi) return
		const answer = method === 'showHelp' ? '`--help`' : '`--version`'
		context.flag(
			node,
			'show-help',
			`\`ui.${method}()\` is removed from \`ui\` in clibuilder 12; core answers ${answer} on stdout. To answer from \`run()\`, return the content with \`document(text)\` or \`result(value)\`.`
		)
	})
}

/** Where each `@clibuilder/axi` export goes in clibuilder 12. axi-native RFC sections 4 and 4.1. */
const AXI_MOVES: Record<string, { module: string } | { replacement: string }> = {
	exitCodes: { module: 'clibuilder/axi' },
	truncateText: { module: 'clibuilder/axi' },
	truncateList: { module: 'clibuilder/axi' },
	defaultTextLimit: { module: 'clibuilder/axi' },
	fullOption: { module: 'clibuilder/axi' },
	orEmpty: { module: 'clibuilder/axi' },
	homeHeader: { module: 'clibuilder/axi' },
	collapseHome: { module: 'clibuilder/axi' },
	ErrorReport: { replacement: 'throw `new CliError(message, { code, details, help })`, which core renders once' },
	errorOutput: { replacement: 'throw `new CliError(message, { code, details, help })`, which core renders once' },
	encodeError: { replacement: 'throw `new CliError(message, { code, details, help })`, which core renders once' },
	writeError: { replacement: 'throw `new CliError(message, { code, details, help })`, which core renders once' },
	createOutput: { replacement: 'return the value from `run()`, or `result(value, { help, render })`' },
	Output: { replacement: 'return the value from `run()`, or `result(value, { help, render })`' },
	OutputResult: { replacement: 'return the value from `run()`, or `result(value, { help, render })`' },
	ResultOptions: { replacement: 'pass the options to `result(value, { help, render })`' },
	OutputRenderers: { replacement: 'pass renderers to `result(value, { render })`' },
	writeResult: { replacement: 'return the value from `run()`, or `result(value, { help, render })`' },
	encodeResult: { replacement: 'return the value from `run()`, which core encodes in `this.format`' },
	writeDocument: { replacement: 'return `document(content)` from `run()`' },
	withHelp: { replacement: 'pass the lines to `result(value, { help })`' },
	helpLines: { replacement: 'pass the lines to `result(value, { help })`' },
	Help: { replacement: 'pass the lines to `result(value, { help })`' },
	OutputWriter: { replacement: 'pass the streams to `cli({ streams })`' },
	formatOption: { replacement: 'read the global `--format` from `this.format`' },
	defineFormatOption: { replacement: 'set the default with `cli({ format })` and read `this.format`' },
	parseFormat: { replacement: 'read the global `--format` from `this.format`' },
	formats: { replacement: 'read the global `--format` from `this.format`' },
	OutputFormat: { replacement: 'read the global `--format` from `this.format`' },
	renderText: {
		replacement: "use core's `text` format (`--format text`), or pass a renderer to `result(value, { render })`"
	},
	createUsageErrorHandler: {
		replacement: 'delete the `onUsageError` handler; core reports ranked, coded usage errors'
	},
	describeUsageError: { replacement: 'delete the `onUsageError` handler; core reports ranked, coded usage errors' }
}

/**
 * `@clibuilder/axi` is folded into `clibuilder` and `clibuilder/axi`. Moves the imports with a new home,
 * and flags the ones a core feature replaces.
 */
export function transformAxiImports(context: FileContext) {
	for (const declaration of importsFrom(context.sourceFile, '@clibuilder/axi')) {
		const bindings = declaration.importClause?.namedBindings
		if (!bindings || !ts.isNamedImports(bindings) || declaration.importClause?.name) {
			context.flag(
				declaration,
				'axi-import',
				'`@clibuilder/axi` has no clibuilder 12 release. Import its value helpers from `clibuilder/axi`; its output, error, format and usage parts are built into `clibuilder`.'
			)
			continue
		}
		const typeOnly = declaration.importClause?.isTypeOnly ?? false
		const moved = new Map<string, string[]>()
		const kept: string[] = []
		for (const { specifier, imported } of namedImports(context.sourceFile, '@clibuilder/axi').filter(
			(i) => i.declaration === declaration
		)) {
			const move = AXI_MOVES[imported]
			if (move && 'module' in move) {
				const list = moved.get(move.module) ?? []
				list.push(context.nodeText(specifier))
				moved.set(move.module, list)
			} else {
				kept.push(context.nodeText(specifier))
				context.flag(
					specifier,
					'axi-import',
					`\`${imported}\` from \`@clibuilder/axi\` has no clibuilder 12 export. Instead, ${move && 'replacement' in move ? move.replacement : 'use the core feature that replaces it'}.`
				)
			}
		}
		if (moved.size === 0) continue
		const lines = [...moved].map(
			([module, specifiers]) => `import ${typeOnly ? 'type ' : ''}{ ${specifiers.join(', ')} } from '${module}'`
		)
		for (const [module, specifiers] of moved) {
			context.rewrite(declaration, 'axi-import', `${specifiers.join(', ')}: \`@clibuilder/axi\` → \`${module}\``)
		}
		if (kept.length > 0) {
			replaceNamedImports(context, declaration, kept)
			addImportAfter(context, declaration, lines.join('\n'))
		} else {
			context.replace(declaration.getStart(context.sourceFile), declaration.end, lines.join('\n'))
		}
	}
}

/**
 * clibuilder 12 no longer loads plugins from `config`. slim-dependencies RFC section 9.
 *
 * A `cli()` that sets `keywords` uses plugins for certain, so the keywords move into `plugins()`.
 * One that sets only `config` may not, so it is flagged unless `addPlugins` is set.
 */
export function transformPlugins(context: FileContext, options: { addPlugins: boolean }) {
	const cliImport = namedImports(context.sourceFile, 'clibuilder').find((i) => i.imported === 'cli')
	if (!cliImport || importsFrom(context.sourceFile, '@clibuilder/plugins').length > 0) return

	let pluginsName: string | undefined
	forEachNode(context.sourceFile, (node) => {
		if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== cliImport.local)
			return
		const [arg] = node.arguments
		if (!arg || !ts.isObjectLiteralExpression(arg)) return
		const keywords = arg.properties.find((p) => propertyName(p) === 'keywords')
		const config = arg.properties.find((p) => propertyName(p) === 'config')
		if (!keywords && !config) return
		if (!keywords && !options.addPlugins) {
			context.flag(
				config!,
				'plugins',
				"clibuilder 12 no longer loads plugins from `config`. If this CLI loads plugins, add `.use(plugins())` from '@clibuilder/plugins' and the dependency (or rerun the codemod with `--add-plugins`)."
			)
			return
		}
		pluginsName ??= context.freeName('plugins', 'clibuilderPlugins')
		let pluginOptions = ''
		if (keywords) {
			const value = ts.isShorthandPropertyAssignment(keywords)
				? 'keywords'
				: ts.isPropertyAssignment(keywords)
					? `keywords: ${context.nodeText(keywords.initializer)}`
					: undefined
			if (!value) {
				context.flag(keywords, 'plugins', 'Move `keywords` into `plugins({ keywords })` from `@clibuilder/plugins`.')
				return
			}
			pluginOptions = `{ ${value} }`
			removeProperty(context, arg, keywords)
		}
		context.replace(node.end, node.end, `.use(${pluginsName}(${pluginOptions}))`)
		context.rewrite(
			node,
			'plugins',
			`added \`.use(${pluginsName}(${pluginOptions}))\`: clibuilder 12 loads plugins only through \`@clibuilder/plugins\``
		)
	})
	if (!pluginsName) return
	const specifier = pluginsName === 'plugins' ? 'plugins' : `plugins as ${pluginsName}`
	addImportAfter(context, cliImport.declaration, `import { ${specifier} } from '@clibuilder/plugins'`)
	context.dependencies.add('@clibuilder/plugins')
}

function removeProperty(
	context: FileContext,
	object: ts.ObjectLiteralExpression,
	property: ts.ObjectLiteralElementLike
) {
	const index = object.properties.indexOf(property)
	const next = object.properties[index + 1]
	const previous = object.properties[index - 1]
	if (next) context.replace(property.getStart(context.sourceFile), next.getStart(context.sourceFile), '')
	else if (previous) context.replace(previous.end, property.end, '')
	else context.replace(property.getStart(context.sourceFile), property.end, '')
}

/** `this.keywords` is removed with plugin loading. slim-dependencies RFC section 9.2. */
export function flagKeywords(context: FileContext) {
	forEachNode(context.sourceFile, (node) => {
		if (
			ts.isPropertyAccessExpression(node) &&
			node.expression.kind === ts.SyntaxKind.ThisKeyword &&
			node.name.text === 'keywords'
		) {
			context.flag(
				node,
				'plugins',
				'`this.keywords` is removed in clibuilder 12. Pass the keywords to `plugins({ keywords })` and read them from there.'
			)
		}
	})
}

const ANSWER_HELPERS = new Set(['result', 'document', 'empty'])

/**
 * Lists every `return <expr>` in a `run()`: in clibuilder 12's default `output: 'axi'` it is printed.
 * axi-native RFC section 3.5.
 */
export function auditReturns(context: FileContext) {
	forEachNode(context.sourceFile, (node) => {
		const body = runBody(node)
		if (!body) return
		if (!ts.isBlock(body)) {
			reviewReturn(context, body)
			return
		}
		const visit = (child: ts.Node) => {
			if (ts.isFunctionLike(child) || ts.isClassLike(child)) return
			if (ts.isReturnStatement(child) && child.expression) reviewReturn(context, child.expression)
			ts.forEachChild(child, visit)
		}
		ts.forEachChild(body, visit)
	})
}

function runBody(node: ts.Node): ts.ConciseBody | undefined {
	if (ts.isMethodDeclaration(node) && propertyName(node) === 'run' && ts.isObjectLiteralExpression(node.parent)) {
		return node.body
	}
	if (ts.isPropertyAssignment(node) && propertyName(node) === 'run') {
		const fn = node.initializer
		if (ts.isFunctionExpression(fn) || ts.isArrowFunction(fn)) return fn.body
	}
	return undefined
}

function reviewReturn(context: FileContext, expression: ts.Expression) {
	let value = expression
	while (ts.isAwaitExpression(value) || ts.isParenthesizedExpression(value)) value = value.expression
	if (ts.isIdentifier(value) && value.text === 'undefined') return
	if (ts.isVoidExpression(value)) return
	if (ts.isCallExpression(value) && ts.isIdentifier(value.expression) && ANSWER_HELPERS.has(value.expression.text))
		return
	const text = context.nodeText(expression).replace(/\s+/g, ' ')
	context.review(
		expression,
		'printed-return',
		`\`return ${text.length > 50 ? `${text.slice(0, 49)}…` : text}\` in \`run()\` is printed under the default \`output: 'axi'\`. Keep it if it is the answer; return \`undefined\` to print nothing.`
	)
}
