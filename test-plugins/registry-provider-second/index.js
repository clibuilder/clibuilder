const { defineKey } = require('clibuilder')

const capability = defineKey('clibuilder:test-capability')

exports.activate = function activate(context) {
	context.register(capability, 'shadowed')
}
