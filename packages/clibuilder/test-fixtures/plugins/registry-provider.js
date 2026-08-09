const capability = { id: 'clibuilder:test-capability', kind: 'value' }
const documents = { id: 'clibuilder:test-documents', kind: 'collection' }

export async function activate(context) {
	await Promise.resolve()
	context.register(capability, 'provided')
	context.register(documents, 'document')
}
