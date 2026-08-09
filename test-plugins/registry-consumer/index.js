const capability = { id: 'clibuilder:test-capability', kind: 'value' }
const documents = { id: 'clibuilder:test-documents', kind: 'collection' }

exports.activate = function activate(context) {
	context.addCommand({
		name: 'registry',
		run() {
			const value = this.registry.get(capability)
			const contributions = this.registry.get(documents)
			this.ui.info(value, contributions.map(({ source, value }) => `${source}:${value}`).join(','))
		}
	})
}
