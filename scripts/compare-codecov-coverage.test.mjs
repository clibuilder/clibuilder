import assert from 'node:assert/strict'
import test from 'node:test'
import { formatPercent, parseLcov } from './compare-codecov-coverage.mjs'

test('parses executable lines and deduplicates repeated source entries', () => {
	const coverage = parseLcov(`SF:src/example.ts
DA:1,3
DA:2,0
end_of_record
SF:src/example.ts
DA:1,1
DA:3,1
end_of_record`)

	assert.deepEqual(coverage, { lines: 3, hits: 2, coverage: 66.66666666666666 })
})

test('formats coverage to two decimal places', () => {
	assert.equal(formatPercent(98.789), '98.79%')
})
