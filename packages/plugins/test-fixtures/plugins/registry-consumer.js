const capability = { id: 'clibuilder:test-capability', kind: 'value' }
const documents = { id: 'clibuilder:test-documents', kind: 'collection' }

export function activate(context) {
	context.addCommand({
		name: 'registry',
		run() {
			return {
				capability: this.registry.get(capability),
				sources: this.registry.get(documents).map(({ source }) => source)
			}
		}
	})
}
