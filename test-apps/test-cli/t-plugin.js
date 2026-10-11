// a CommonJS plugin whose option type comes from `require('clibuilder').t`,
// loaded by an ESM host in entries.test.js.
const { t } = require('clibuilder')

module.exports = {
	activate({ addCommand }) {
		addCommand({
			name: 'repeat',
			arguments: [{ name: 'value' }],
			options: { times: { type: t.int({ min: 1 }), default: 1 } },
			run({ value, times }) {
				return Array(times).fill(value).join(' ')
			}
		})
	}
}
