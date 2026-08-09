const { defineCollectionKey, defineKey } = require('clibuilder')

const capability = defineKey('clibuilder:test-capability')
const documents = defineCollectionKey('clibuilder:test-documents')

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
