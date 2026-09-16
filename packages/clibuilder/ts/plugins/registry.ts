declare const KeyType: unique symbol

export type RegistryKey<T> = {
	readonly id: string
	readonly kind: 'value' | 'collection'
	readonly [KeyType]: T
}

export type ValueKey<T> = RegistryKey<T> & { readonly kind: 'value' }
export type CollectionKey<T> = RegistryKey<T> & { readonly kind: 'collection' }

export type Contribution<T> = {
	readonly source: string
	readonly value: T
}

export type Registry = {
	get<T>(key: ValueKey<T>): T | undefined
	get<T>(key: CollectionKey<T>): readonly Contribution<T>[]
	has(key: RegistryKey<unknown>): boolean
	describe(key: RegistryKey<unknown>): readonly string[]
}

export type RegistryOwner = Registry & {
	register<T>(source: string, key: ValueKey<T> | CollectionKey<T>, value: T): Registration
}

export type Registration = { readonly accepted: boolean; readonly source?: string }

export function defineKey<T>(id: string): ValueKey<T> {
	return { id, kind: 'value' } as ValueKey<T>
}

export function defineCollectionKey<T>(id: string): CollectionKey<T> {
	return { id, kind: 'collection' } as CollectionKey<T>
}

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
