/**
 * `T` with the keys `K` required.
 */
export type RequiredPick<T, K extends keyof T> = T & { [k in K]-?: T[k] }

/**
 * The union of the element types of an array or tuple.
 */
export type UnionOfValues<T extends readonly unknown[]> = T[number]
