const { defineCollectionKey, defineKey } = require('clibuilder')

const capability = defineKey('clibuilder:test-capability')
const documents = defineCollectionKey('clibuilder:test-documents')

exports.activate = async function activate(context) {
	await Promise.resolve()
	context.register(capability, 'provided')
	context.register(documents, 'document')
}
