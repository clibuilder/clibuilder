declare const KeyType: unique symbol

/** A typed key into a {@link Registry}. Create one with {@link defineKey} or {@link defineCollectionKey}. */
export type RegistryKey<T> = {
	readonly id: string
	readonly kind: 'value' | 'collection'
	readonly [KeyType]: T
}

/** A key holding at most one value; the first registration wins. */
export type ValueKey<T> = RegistryKey<T> & { readonly kind: 'value' }
/** A key holding every contribution, in registration order. */
export type CollectionKey<T> = RegistryKey<T> & { readonly kind: 'collection' }

/** A value in the registry and the `source` that registered it. */
export type Contribution<T> = {
	readonly source: string
	readonly value: T
}

/** Read access to the values extensions share. */
export type Registry = {
	/** The value for a value key, or the contributions for a collection key. */
	get<T>(key: ValueKey<T>): T | undefined
	get<T>(key: CollectionKey<T>): readonly Contribution<T>[]
	has(key: RegistryKey<unknown>): boolean
	/** The sources that registered under `key`. */
	describe(key: RegistryKey<unknown>): readonly string[]
}

/** A {@link Registry} that can also be written to. */
export type RegistryOwner = Registry & {
	/** Registers `value` under `key` on behalf of `source`. A second value for a value key is rejected. */
	register<T>(source: string, key: ValueKey<T> | CollectionKey<T>, value: T): Registration
}

/** The outcome of `register()`. When `accepted` is false, `source` names the existing registrant. */
export type Registration = { readonly accepted: boolean; readonly source?: string }

/** Creates a key for a single value. `id` must be unique across extensions. */
export function defineKey<T>(id: string): ValueKey<T> {
	return { id, kind: 'value' } as ValueKey<T>
}

/** Creates a key for a collection of values. `id` must be unique across extensions. */
export function defineCollectionKey<T>(id: string): CollectionKey<T> {
	return { id, kind: 'collection' } as CollectionKey<T>
}

/** Creates an empty registry. The cli creates its own, so a caller only needs this in tests. */
export function createRegistry(): RegistryOwner {
	const values = new Map<string, Contribution<unknown>>()
	const collections = new Map<string, Contribution<unknown>[]>()
	function get<T>(key: ValueKey<T>): T | undefined
	function get<T>(key: CollectionKey<T>): readonly Contribution<T>[]
	function get(key: ValueKey<unknown> | CollectionKey<unknown>) {
		if (key.kind === 'collection') return collections.get(key.id) ?? []
		return values.get(key.id)?.value
	}

	return {
		register(source, key, value) {
			if (key.kind === 'collection') {
				const contributions = collections.get(key.id) ?? []
				contributions.push({ source, value })
				collections.set(key.id, contributions)
				return { accepted: true }
			}

			const existing = values.get(key.id)
			if (existing) return { accepted: false, source: existing.source }
			values.set(key.id, { source, value })
			return { accepted: true }
		},
		get,
		has(key) {
			return key.kind === 'collection' ? collections.has(key.id) : values.has(key.id)
		},
		describe(key) {
			if (key.kind === 'collection') return (collections.get(key.id) ?? []).map(({ source }) => source)
			const source = values.get(key.id)?.source
			return source ? [source] : []
		}
	}
}
