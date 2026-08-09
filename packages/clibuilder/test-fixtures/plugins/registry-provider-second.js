const capability = { id: 'clibuilder:test-capability', kind: 'value' }

export function activate(context) {
	context.register(capability, 'shadowed')
}
