module.exports = {
	env: {
		es6: true,
		jest: true,
		node: true
	},
	extends: 'plugin:harmony/latest',
	overrides: [
		{
			extends: 'plugin:harmony/ts-prettier',
			files: ['*.ts'],
			rules: {
				'no-use-before-define': 'off'
			}
		}
	],
	parserOptions: {
		sourceType: 'module'
	},
	root: true
}
