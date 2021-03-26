import * as z from 'zod'
export { z }

export function isZodArray(type: z.ZodAny | undefined): type is z.ZodArray<any> {
  return type && (type as any).element
}

export function isZodOptional(type: z.ZodAny | undefined): type is z.ZodOptional<any> {
  return !!type && type.isOptional()
}

export function isZodBoolean(type: z.ZodAny | undefined): type is z.ZodBoolean {
  return isZodType(type, 'ZodBoolean')
}

export function isZodNumber(type: z.ZodAny | undefined): type is z.ZodBoolean {
  return isZodType(type, 'ZodNumber')
}

export function isZodString(type: z.ZodAny | undefined): type is z.ZodString {
  return isZodType(type, 'ZodString')
}

function isZodType(type: z.ZodAny | undefined, name: string) {
  return Object.getPrototypeOf(type).constructor.name === name
}
