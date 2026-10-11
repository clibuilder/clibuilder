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

/** Test-only exports that clibuilder 12 serves only from `clibuilder/testing`. slim-dependencies RFC section 5.1. */
const TESTING_EXPORTS = new Set(['testCommand'])

/** The config exports that clibuilder 12 serves only from `clibuilder/config` (#692). */
const CONFIG_EXPORTS = new Set([
	'describeConfigSource',
	'getConfigFilenames',
	'getConfigFormat',
	'loadConfig',
	'lookupConfig',
	'readConfigFile',
	'resolveConfig',
	'ConfigFormat',
	'ConfigLoadResult',
	'ConfigLookupResult',
	'ConfigSource'
])

/** Where each export that leaves the `clibuilder` root goes, and why. */
const SUBPATH_MOVES = [
	{
		exports: TESTING_EXPORTS,
		module: 'clibuilder/testing',
		rule: 'testing-import',
		why: 'clibuilder 12 exports test helpers only from `clibuilder/testing`'
	},
	{
		exports: CONFIG_EXPORTS,
		module: 'clibuilder/config',
		rule: 'config',
		why: 'clibuilder 12 exports config loading only from `clibuilder/config`'
	}
] as const

/**
 * Reports each export imported from `clibuilder` that clibuilder 12 serves from a subpath,
 * and flags its use through a namespace import.
 * `moveSubpathImports` makes the edit, over the output of the other rules.
 */
export function reportSubpathImports(context: FileContext) {
	for (const { specifier, imported } of namedImports(context.sourceFile, 'clibuilder')) {
		const move = SUBPATH_MOVES.find((m) => m.exports.has(imported))
		if (move) context.rewrite(specifier, move.rule, `${imported}: \`clibuilder\` → \`${move.module}\`: ${move.why}`)
	}
	const namespaces = new Set(
		importsFrom(context.sourceFile, 'clibuilder').flatMap((declaration) => {
			const bindings = declaration.importClause?.namedBindings
			return bindings && ts.isNamespaceImport(bindings) ? [bindings.name.text] : []
		})
	)
	if (namespaces.size === 0) return
	forEachNode(context.sourceFile, (node) => {
		if (!ts.isPropertyAccessExpression(node) || !ts.isIdentifier(node.expression)) return
		if (!namespaces.has(node.expression.text)) return
		const move = SUBPATH_MOVES.find((m) => m.exports.has(node.name.text))
		if (!move) return
		context.flag(
			node,
			move.rule,
			`\`${node.name.text}\` is not exported from \`clibuilder\` in clibuilder 12. Import it from \`${move.module}\`.`
		)
	})
}

/**
 * Moves the exports clibuilder 12 serves from a subpath, such as `testCommand` to `clibuilder/testing`
 * and `resolveConfig` to `clibuilder/config`, joining an existing import of that subpath when there is one.
 *
 * It runs over the output of the other rules, because the zod rule rewrites the `{ … }` of the same import,
 * and the config rule adds a `clibuilder/config` import.
 */
export function moveSubpathImports(context: FileContext) {
	for (const declaration of importsFrom(context.sourceFile, 'clibuilder')) {
		const specifiers = namedImports(context.sourceFile, 'clibuilder').filter((i) => i.declaration === declaration)
		const typeOnly = declaration.importClause?.isTypeOnly ?? false
		const lines: string[] = []
		for (const move of SUBPATH_MOVES) {
			const moved = specifiers.filter((i) => move.exports.has(i.imported)).map((i) => context.nodeText(i.specifier))
			if (moved.length === 0) continue
			const target = importsFrom(context.sourceFile, move.module).find(
				(d) =>
					d.importClause?.namedBindings &&
					ts.isNamedImports(d.importClause.namedBindings) &&
					(d.importClause.isTypeOnly ?? false) === typeOnly
			)
			if (target) {
				const existing = namedImports(context.sourceFile, move.module)
					.filter((i) => i.declaration === target)
					.map((i) => context.nodeText(i.specifier))
				replaceNamedImports(context, target, [...existing, ...moved.filter((m) => !existing.includes(m))])
			} else {
				lines.push(`import ${typeOnly ? 'type ' : ''}{ ${moved.join(', ')} } from '${move.module}'`)
			}
		}
		const kept = specifiers
			.filter((i) => !SUBPATH_MOVES.some((m) => m.exports.has(i.imported)))
			.map((i) => context.nodeText(i.specifier))
		if (kept.length === specifiers.length) continue
		if (lines.length > 0 && kept.length === 0 && !declaration.importClause?.name) {
			context.replace(declaration.getStart(context.sourceFile), declaration.end, lines.join('\n'))
			continue
		}
		replaceNamedImports(context, declaration, kept)
		if (lines.length > 0) addImportAfter(context, declaration, lines.join('\n'))
	}
}

/**
 * clibuilder 12 loads config only through `.use(config())` from `clibuilder/config` (#692).
 *
 * `config: true` becomes `.use(config())` and `config: 'name'` becomes `.use(config({ name: 'name' }))`.
 * `config: false` is dropped. Any other value is flagged.
 *
 * It runs after `transformPlugins`, so the `.use(config())` it adds lands before `.use(plugins())`,
 * which reads the config.
 */
export function transformConfig(context: FileContext) {
	const cliImport = namedImports(context.sourceFile, 'clibuilder').find((i) => i.imported === 'cli')
	if (!cliImport) return

	let configName: string | undefined
	forEachNode(context.sourceFile, (node) => {
		if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== cliImport.local)
			return
		const [arg] = node.arguments
		if (!arg || !ts.isObjectLiteralExpression(arg)) return
		const property = arg.properties.find((p) => propertyName(p) === 'config')
		if (!property) return
		const value = ts.isPropertyAssignment(property) ? property.initializer : undefined
		const options =
			value?.kind === ts.SyntaxKind.TrueKeyword
				? ''
				: value && (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
					? `{ name: ${context.nodeText(value)} }`
					: undefined
		if (value?.kind === ts.SyntaxKind.FalseKeyword) {
			removeProperty(context, arg, property)
			context.rewrite(property, 'config', 'removed `config: false`: clibuilder 12 has no `cli({ config })`')
			return
		}
		if (options === undefined) {
			context.flag(
				property,
				'config',
				"clibuilder 12 removes `cli({ config })`. Load config with `.use(config())`, or `.use(config({ name }))`, from 'clibuilder/config'."
			)
			return
		}
		configName ??= bindsName(context.sourceFile, 'config') ? context.freeName('clibuilderConfig') : 'config'
		removeProperty(context, arg, property)
		context.replace(node.end, node.end, `.use(${configName}(${options}))`)
		context.rewrite(
			node,
			'config',
			`replaced \`${context.nodeText(property)}\` with \`.use(${configName}(${options}))\`: clibuilder 12 loads config only through \`clibuilder/config\``
		)
	})
	if (!configName) return
	const specifier = configName === 'config' ? 'config' : `config as ${configName}`
	addImportAfter(context, cliImport.declaration, `import { ${specifier} } from 'clibuilder/config'`)
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
		const config = arg.properties.find(
			(p) =>
				propertyName(p) === 'config' &&
				!(ts.isPropertyAssignment(p) && p.initializer.kind === ts.SyntaxKind.FalseKeyword)
		)
		if (!keywords && !config) return
		if (!keywords && !options.addPlugins) {
			// on the call, as `transformConfig` removes the `config` property
			context.flag(
				node,
				'plugins',
				"clibuilder 12 no longer loads plugins from `config`. If this CLI loads plugins, `.use(plugins())` from '@clibuilder/plugins' is required: add it and the dependency, or rerun the codemod with `--add-plugins`."
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

/**
 * Removes a property with its comma and the comments above it, which describe it.
 * The range ends at the property's own comma, so removing two properties never makes overlapping edits.
 */
function removeProperty(
	context: FileContext,
	object: ts.ObjectLiteralExpression,
	property: ts.ObjectLiteralElementLike
) {
	const text = context.text
	let start = property.getFullStart()
	let end = property.end
	const after = skipBlanks(text, end)
	if (text[after] === ',') end = after + 1
	else {
		// the last property gives up the comma before it instead
		const previous = object.properties[object.properties.indexOf(property) - 1]
		if (previous) start = text.lastIndexOf(',', property.getStart(context.sourceFile))
	}
	context.replace(start, end, '')
}

function skipBlanks(text: string, pos: number) {
	while (text[pos] === ' ' || text[pos] === '\t') pos++
	return pos
}

/** Whether the file declares `name`: an import, a variable, a parameter, a function or a class. */
function bindsName(sourceFile: ts.SourceFile, name: string) {
	let found = false
	forEachNode(sourceFile, (node) => {
		if (found) return
		if (
			(ts.isImportSpecifier(node) ||
				ts.isImportClause(node) ||
				ts.isNamespaceImport(node) ||
				ts.isVariableDeclaration(node) ||
				ts.isParameter(node) ||
				ts.isFunctionDeclaration(node) ||
				ts.isClassDeclaration(node)) &&
			node.name &&
			ts.isIdentifier(node.name) &&
			node.name.text === name
		)
			found = true
	})
	return found
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
