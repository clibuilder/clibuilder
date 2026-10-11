import ts from 'typescript'
import type { FileContext } from './context.js'
import { namedImports, replaceNamedImports } from './imports.js'

/**
 * A zod call chain read as a `t` descriptor.
 */
type Descriptor = {
	kind: 'string' | 'number' | 'int' | 'boolean' | 'literal' | 'enum' | 'array'
	/** The argument text for `literal` and `enum`. */
	argument?: string
	/** The element of an `array`. */
	element?: Descriptor
	/** The options bag, in insertion order: `min`, `max`, `pattern`. */
	options: Map<string, string>
	optional: boolean
}

type Read = { ok: true; descriptor: Descriptor } | { ok: false; reason: string }

const unsupported = (reason: string): Read => ({ ok: false, reason })

const FORMAT_CHECKS = new Set([
	'email',
	'url',
	'uuid',
	'cuid',
	'cuid2',
	'ulid',
	'datetime',
	'date',
	'time',
	'ip',
	'emoji',
	'base64',
	'startsWith',
	'endsWith',
	'includes',
	'length',
	'nonempty'
])

/**
 * Rewrites `z` from `clibuilder` to `t`, and flags what has no `t` equivalent.
 * slim-dependencies RFC section 7, step 2.
 */
export function transformZod(context: FileContext) {
	const zImports = namedImports(context.sourceFile, 'clibuilder').filter((i) => i.imported === 'z')
	if (zImports.length === 0) return
	const zLocal = zImports[0]!.local
	const existingT = namedImports(context.sourceFile, 'clibuilder').find((i) => i.imported === 't')
	const tName = existingT?.local ?? context.freeName('t', 'ct')

	const tops: ts.Node[] = []
	const typeUses: ts.Node[] = []
	const otherUses: ts.Identifier[] = []

	const visit = (node: ts.Node) => {
		if (ts.isIdentifier(node) && node.text === zLocal && isReference(node)) {
			const parent = node.parent
			if (ts.isQualifiedName(parent) && parent.left === node) typeUses.push(outermostType(parent, zLocal))
			else if (ts.isPropertyAccessExpression(parent) && parent.expression === node) tops.push(chainTop(parent))
			else otherUses.push(node)
		}
		ts.forEachChild(node, visit)
	}
	visit(context.sourceFile)

	let converted = 0
	let remaining = 0
	for (const top of outermost(tops)) {
		const read = readChain(top, zLocal)
		if (read.ok) {
			const text = render(read.descriptor, tName)
			context.replace(top.getStart(context.sourceFile), top.end, text)
			context.rewrite(top, 'zod', `${oneLine(context.nodeText(top))} → ${text}`)
			converted++
		} else {
			context.flag(top, 'zod', read.reason)
			remaining++
		}
	}
	for (const node of outermost(typeUses)) {
		const text = oneLine(context.nodeText(node), 60)
		context.flag(
			node,
			'zod-type',
			/^\w+\.(infer|input|output)</.test(text)
				? `\`${text}\` is removed with zod. Use the type \`run()\` infers for its \`args\`, or the type of your own schema.`
				: `zod type \`${text}\` has no clibuilder 12 equivalent. Drop the annotation and let the \`t\` descriptor infer it, or use \`satisfies\`.`
		)
		remaining++
	}
	for (const node of otherUses) {
		context.flag(node, 'zod', '`z` is removed from clibuilder 12. Replace this use with `t`.')
		remaining++
	}

	for (const zImport of zImports) {
		const specifiers = namedImports(context.sourceFile, 'clibuilder')
			.filter((i) => i.declaration === zImport.declaration)
			.flatMap((i) => {
				if (i.specifier !== zImport.specifier) return [context.nodeText(i.specifier)]
				const t = converted > 0 && !existingT && zImport === zImports[0] ? [tName === 't' ? 't' : `t as ${tName}`] : []
				return remaining > 0 ? [...t, context.nodeText(i.specifier)] : t
			})
		replaceNamedImports(context, zImport.declaration, specifiers)
	}
	if (remaining > 0) {
		context.flag(
			zImports[0]!.specifier,
			'zod-import',
			`\`z\` is removed from clibuilder 12. ${remaining} use(s) below are flagged; rewrite them with \`t\`, then remove \`z\` from this import.`
		)
	} else if (converted > 0) {
		context.rewrite(zImports[0]!.specifier, 'zod-import', `import { ${zLocal} } → import { ${tName} }`)
	}
}

/** Excludes property names, such as the `z` in `a.z` or `{ z: 1 }`, and the import itself. */
function isReference(node: ts.Identifier) {
	const parent = node.parent
	if (ts.isImportSpecifier(parent)) return false
	if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false
	if (ts.isQualifiedName(parent) && parent.right === node) return false
	if ((ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) && parent.name === node) return false
	if (ts.isMethodDeclaration(parent) && parent.name === node) return false
	return true
}

function chainTop(node: ts.Node): ts.Node {
	let current = node
	for (;;) {
		const parent = current.parent
		if (ts.isPropertyAccessExpression(parent) && parent.expression === current) current = parent
		else if (ts.isCallExpression(parent) && parent.expression === current) current = parent
		else return current
	}
}

/** The whole zod type, so `z.ZodOptional<z.ZodString>` is one annotation, but not the `cli.Command<…>` around it. */
function outermostType(node: ts.QualifiedName, zLocal: string): ts.Node {
	let current: ts.Node = node
	for (;;) {
		const parent = current.parent
		if (ts.isQualifiedName(parent)) current = parent
		else if (
			ts.isTypeReferenceNode(parent) &&
			(parent.typeName === current || isZodTypeName(parent.typeName, zLocal))
		) {
			current = parent
		} else return current
	}
}

function isZodTypeName(name: ts.EntityName, zLocal: string): boolean {
	return ts.isQualifiedName(name) ? isZodTypeName(name.left, zLocal) : name.text === zLocal
}

/** Drops duplicates, and nodes nested inside another node of the list. */
function outermost(nodes: ts.Node[]) {
	const unique = [...new Set(nodes)]
	return unique.filter(
		(node) => !unique.some((other) => other !== node && other.pos <= node.pos && node.end <= other.end)
	)
}

function readChain(node: ts.Node, zLocal: string): Read {
	if (!ts.isCallExpression(node)) return unsupported('An uncalled zod member has no `t` equivalent.')
	const callee = node.expression
	if (!ts.isPropertyAccessExpression(callee)) return unsupported('Not a zod call.')
	const name = callee.name.text
	const args = node.arguments
	if (ts.isIdentifier(callee.expression) && callee.expression.text === zLocal) return readBase(name, args, zLocal)
	if (ts.isCallExpression(callee.expression)) {
		const inner = readChain(callee.expression, zLocal)
		return inner.ok ? readMethod(inner.descriptor, name, args) : inner
	}
	const path = callee.expression.getText()
	return unsupported(
		`\`${path}\` is not supported by \`t\`${path.endsWith('.coerce') ? ': a descriptor converts argv itself' : ''}.`
	)
}

function readBase(name: string, args: ts.NodeArray<ts.Expression>, zLocal: string): Read {
	switch (name) {
		case 'string':
		case 'number':
		case 'boolean':
			if (args.length > 0) return unsupported(`\`z.${name}()\` with parameters has no \`t\` equivalent.`)
			return { ok: true, descriptor: { kind: name, options: new Map(), optional: false } }
		case 'literal':
		case 'enum': {
			if (args.length !== 1)
				return unsupported(`\`z.${name}()\` with ${args.length} arguments has no \`t\` equivalent.`)
			return { ok: true, descriptor: { kind: name, argument: args[0]!.getText(), options: new Map(), optional: false } }
		}
		case 'array': {
			if (args.length !== 1) return unsupported('`z.array()` with parameters has no `t` equivalent.')
			const element = readChain(args[0]!, zLocal)
			if (!element.ok) return element
			if (element.descriptor.optional || element.descriptor.kind === 'array') {
				return unsupported('A `t.array` element cannot be optional or an array.')
			}
			return {
				ok: true,
				descriptor: { kind: 'array', element: element.descriptor, options: new Map(), optional: false }
			}
		}
		case 'optional': {
			if (args.length !== 1) return unsupported('`z.optional()` needs one argument.')
			const inner = readChain(args[0]!, zLocal)
			if (inner.ok) inner.descriptor.optional = true
			return inner
		}
		case 'union': {
			const values = args.length === 1 ? unionOfStringLiterals(args[0]!, zLocal) : undefined
			if (!values) return unsupported('Only a `z.union` of string `z.literal`s has a `t` equivalent (`t.enum`).')
			return {
				ok: true,
				descriptor: { kind: 'enum', argument: `[${values.join(', ')}]`, options: new Map(), optional: false }
			}
		}
		case 'object':
			return unsupported(
				'`z.object` has no `t` equivalent. `config` takes any Standard Schema in clibuilder 12, so import `z` for it from your own `zod` dependency.'
			)
		default:
			return unsupported(`\`z.${name}()\` has no \`t\` equivalent.`)
	}
}

function unionOfStringLiterals(node: ts.Expression, zLocal: string) {
	if (!ts.isArrayLiteralExpression(node) || node.elements.length === 0) return undefined
	const values: string[] = []
	for (const element of node.elements) {
		if (
			!ts.isCallExpression(element) ||
			!ts.isPropertyAccessExpression(element.expression) ||
			!ts.isIdentifier(element.expression.expression) ||
			element.expression.expression.text !== zLocal ||
			element.expression.name.text !== 'literal' ||
			element.arguments.length !== 1
		) {
			return undefined
		}
		const value = element.arguments[0]!
		if (!ts.isStringLiteral(value) && !ts.isNoSubstitutionTemplateLiteral(value)) return undefined
		values.push(value.getText())
	}
	return values
}

function readMethod(descriptor: Descriptor, name: string, args: ts.NodeArray<ts.Expression>): Read {
	const ok: Read = { ok: true, descriptor }
	const numeric = descriptor.kind === 'number' || descriptor.kind === 'int'
	switch (name) {
		case 'optional':
			if (args.length > 0) break
			descriptor.optional = true
			return ok
		case 'int':
			if (!numeric || args.length > 0) break
			descriptor.kind = 'int'
			return ok
		case 'min':
		case 'max':
		case 'gte':
		case 'lte': {
			if (!numeric) {
				return unsupported(
					`\`.${name}()\` on \`z.${descriptor.kind}()\` is a length check; \`t\` has no length option, so move it to \`.check()\`.`
				)
			}
			if (args.length !== 1) return unsupported(`\`.${name}()\` with a custom message has no \`t\` equivalent.`)
			descriptor.options.set(name === 'gte' ? 'min' : name === 'lte' ? 'max' : name, args[0]!.getText())
			return ok
		}
		case 'nonnegative':
			if (!numeric || args.length > 0) break
			descriptor.options.set('min', '0')
			return ok
		case 'regex':
			if (descriptor.kind !== 'string') break
			if (args.length !== 1) return unsupported('`.regex()` with a custom message has no `t` equivalent.')
			descriptor.options.set('pattern', args[0]!.getText())
			return ok
	}
	if (FORMAT_CHECKS.has(name)) {
		return unsupported(
			`\`.${name}()\` is a refinement. \`t\` has no built-in formats: use \`t.${descriptor.kind}().check(…)\` with a function, or a schema from your own zod dependency.`
		)
	}
	return unsupported(
		`\`.${name}()\` has no \`t\` equivalent (refinements, transforms, defaults and descriptions are not rewritten).`
	)
}

function render(descriptor: Descriptor, tName: string): string {
	const base = (body: string) => `${tName}.${descriptor.kind}(${body})`
	let text: string
	switch (descriptor.kind) {
		case 'literal':
		case 'enum':
			text = base(descriptor.argument!)
			break
		case 'array':
			text = base(render(descriptor.element!, tName))
			break
		default: {
			const entries = [...descriptor.options].map(([key, value]) => `${key}: ${value}`)
			text = base(entries.length > 0 ? `{ ${entries.join(', ')} }` : '')
		}
	}
	return descriptor.optional ? `${text}.optional()` : text
}

function oneLine(text: string, max = 80) {
	const line = text.replace(/\s+/g, ' ')
	return line.length > max ? `${line.slice(0, max - 1)}…` : line
}
