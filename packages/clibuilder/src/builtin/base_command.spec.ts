import { getBaseCommand } from './base_command.js'

describe('getBaseCommand', () => {
	it('declares no run of its own, so a bare application is a group (#609)', () => {
		expect(getBaseCommand('')).not.toHaveProperty('run')
	})
})
