// Option names come from the command line, so a name such as `constructor` or `__proto__`
// must not find a member of `Object.prototype` or set the object's prototype (#724).

/** The property `key` of `object` itself, or `undefined` when only its prototype has one. */
export function getProp<T>(object: Record<string, T>, key: string): T | undefined {
	// biome-ignore lint/suspicious/noPrototypeBuiltins: `Object.hasOwn` is not in the ES2020 lib this package targets
	return Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined
}

/** Sets `key` on `object` itself, even when the key is `__proto__`. */
export function setProp<T>(object: Record<string, T>, key: string, value: NoInfer<T>) {
	Object.defineProperty(object, key, { value, enumerable: true, writable: true, configurable: true })
}
