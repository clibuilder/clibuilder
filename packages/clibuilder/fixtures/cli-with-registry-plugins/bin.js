const { cli } = require('clibuilder')

cli({ name: 'test-cli', version: '1.0.0', config: true }).parse(process.argv)
