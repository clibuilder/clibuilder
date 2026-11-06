// Option names come from the command line, so a name such as `constructor` or `__proto__`
// must not find a member of `Object.prototype` or set the object's prototype (#724).

/** Whether `object` has `key` as its own property, not one it inherits. */
export function hasOwn(object: object, key: string) {
	// biome-ignore lint/suspicious/noPrototypeBuiltins: `Object.hasOwn` is not in the ES2020 lib this package targets
	return Object.prototype.hasOwnProperty.call(object, key)
}

/** The own property `key` of `object`, or `undefined` when it has none. */
export function getOwn<T>(object: Record<string, T>, key: string): T | undefined {
	return hasOwn(object, key) ? object[key] : undefined
}

/** Sets `key` as an own property of `object`, even when the key is `__proto__`. */
export function setOwn<T>(object: Record<string, T>, key: string, value: NoInfer<T>) {
	Object.defineProperty(object, key, { value, enumerable: true, writable: true, configurable: true })
}
