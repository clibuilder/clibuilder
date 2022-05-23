import * as z from 'zod'
export { z }

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

function isZodType(type: any | undefined, name: string) {
  return Object.getPrototypeOf(type).constructor.name === name
}
