import { z as zod } from 'zod'

/**
 * The zod 3 instance clibuilder validates with.
 *
 * @deprecated declare an argument or option `type` with `t` instead,
 * and pass any Standard Schema, such as zod 4 or valibot, as a command's `config`.
 * `z` is removed in clibuilder 12.
 */
export import z = zod

/**
 * Whether `type` is a zod 3 type, the kind `z` builds.
 * A zod 4 schema is a Standard Schema, not a zod 3 type.
 */
export function isZod3Type(type: unknown): type is z.ZodTypeAny {
	return (
		typeof type === 'object' &&
		type !== null &&
		'_def' in type &&
		typeof (type as any).safeParse === 'function' &&
		!('_zod' in type)
	)
}

export function isZodObject(type: any | undefined): type is z.ZodObject<any> {
	return (type as any).shape
}

export function isZodArray(type: any | undefined): type is z.ZodArray<any> {
	return type && (type as any).element
}

export function isZodOptional(type: any | undefined): type is z.ZodOptional<any> {
	return !!type && type.isOptional()
}

export function isZodBoolean(type: any | undefined): type is z.ZodBoolean {
	return isZodType(type, 'ZodBoolean')
}

export function isZodNumber(type: any | undefined): type is z.ZodBoolean {
	return isZodType(type, 'ZodNumber')
}

export function isZodString(type: any | undefined): type is z.ZodString {
	return isZodType(type, 'ZodString')
}

export function isZodEnum(type: any | undefined): type is z.ZodEnum<[string, ...string[]]> {
	return isZodType(type, 'ZodEnum')
}

function isZodType(type: any | undefined, name: string) {
	return Object.getPrototypeOf(type).constructor.name === name
}
