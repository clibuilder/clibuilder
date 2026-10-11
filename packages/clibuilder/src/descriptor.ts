import type { DescriptorData } from './t.js'

/** Whether a descriptor option takes a value, as `args-minus` decides: a boolean or boolean literal is a flag. */
export function takesValue(data: DescriptorData) {
	const d = data.kind === 'array' ? data.element : data
	return !(d.kind === 'boolean' || (d.kind === 'literal' && typeof d.value === 'boolean'))
}

/**
 * The short form of what a descriptor accepts: `int 1..65535`, `string /^v\d+$/`, `toon|text|json`.
 * Help shows it as the value hint, and an `invalid-value` usage error carries it as `constraint`.
 */
export function describeConstraint(data: DescriptorData): string {
	switch (data.kind) {
		case 'string':
			return data.pattern ? `string ${data.pattern}` : 'string'
		case 'number':
		case 'int':
			return `${data.kind}${describeRange(data.min, data.max)}`
		case 'boolean':
		case 'json':
			return data.kind
		case 'literal':
			return String(data.value)
		case 'enum':
			return data.values.join('|')
		case 'custom':
			return 'value'
		case 'array':
			return describeConstraint(data.element)
	}
}

function describeRange(min: number | undefined, max: number | undefined) {
	if (min !== undefined && max !== undefined) return ` ${min}..${max}`
	if (min !== undefined) return ` >=${min}`
	if (max !== undefined) return ` <=${max}`
	return ''
}
