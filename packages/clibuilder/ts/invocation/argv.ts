export namespace parseArgv {
	export type State = {
		args: Result
		key: string
		values: string[]
	}
	export type Result = { _: string[]; __?: string[] } & Record<string, string[]>
}

export function parseArgv(argv: string[]) {
	const result = argv.slice(2).reduce<parseArgv.State>(
		(result, v) => {
			if (result.args.__) result.args.__.push(v)
			else if (isOption(v)) {
				if (isInOptionState(result)) result = endOption(result)
				result = startOption(result, v)
			} else if (isInOptionState(result)) result.values.push(v)
			else if (v === '--') result.args.__ = []
			else result.args._.push(v)

			return result
		},
		{ args: { _: [] }, key: '', values: [] }
	)

	return (isInOptionState(result) ? endOption(result) : result).args
}

function isInOptionState(result: parseArgv.State) {
	return !!result.key
}

function isOption(value: string) {
	return value.startsWith('-') && /\w+/.test(value)
}

function startOption(result: parseArgv.State, value: string) {
	if (/^-\w+/.test(value)) {
		return startSingleCharacterOptions(result, value)
	}
	return startMultiCharacterOptions(result, value)
}

function startSingleCharacterOptions(result: parseArgv.State, value: string) {
	const eqIndex = value.indexOf('=')

	const [keyString, lastValues] =
		eqIndex > 0 ? [value.slice(1, eqIndex), [value.slice(eqIndex + 1)]] : [value.slice(1), []]
	const keys = keyString.split('')
	const lastKey = keys.pop()!
	result = addBooleanOptions(result, keys)
	result.key = lastKey
	result.values = lastValues
	return result
}

function addBooleanOptions(result: parseArgv.State, keys: string[]): parseArgv.State {
	if (keys.length <= 0) return result
	const key = keys.pop()!
	result.key = key
	result.values = ['true']
	return addBooleanOptions(endOption(result), keys)
}

function startMultiCharacterOptions(result: parseArgv.State, value: string) {
	const eqIndex = value.indexOf('=')
	if (eqIndex > 0) {
		result.key = value.slice(2, eqIndex)
		result.values = [value.slice(eqIndex + 1)]
	} else {
		result.key = value.slice(2)
		result.values = []
	}
	return result
}

function endOption(state: parseArgv.State) {
	const { key, values } = state
	const args = { ...state.args }

	if (!args[key]) args[key] = []
	if (values.length === 0) args[key].push('true')
	else args[key].push(...values)

	return { args, key: '', values: [] }
}
