const capability = { id: 'clibuilder:test-capability', kind: 'value' }

exports.activate = function activate(context) {
	context.register(capability, 'shadowed')
}
