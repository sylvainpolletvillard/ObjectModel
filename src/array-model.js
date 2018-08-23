import {
	_validate, cast, checkAssertions, checkDefinition, extendDefinition, extendModel,
	formatDefinition, Model, stackError, unstackErrors
} from "./object-model.js"
import { extend } from "./helpers.js"
import { initListModel } from "./list-model.js"

export default function ArrayModel(initialDefinition) {
	let model = initListModel(
		Array,
		ArrayModel,
		initialDefinition,
		a => Array.isArray(a) ? a.map(arg => cast(arg, model.definition)) : a,
		a => [...a],
		{
			"copyWithin": [],
			"fill": [0, 0],
			"pop": [],
			"push": [0],
			"reverse": [],
			"shift": [],
			"sort": [],
			"splice": [2],
			"unshift": [0]
		},
		{
			set(arr, key, val) {
				return setArrayKey(arr, key, val, model)
			},

			deleteProperty(arr, key) {
				return !(key in arr) || setArrayKey(arr, key, undefined, model)
			}
		}
	)

	return model
}

extend(ArrayModel, Model, {
	toString(stack) {
		return 'Array of ' + formatDefinition(this.definition, stack)
	},

	[_validate](arr, path, errors, stack) {
		if (Array.isArray(arr))
			arr.forEach((a, i) => checkDefinition(a, this.definition, `${path || "Array"}[${i}]`, errors, stack))
		else stackError(errors, this, arr, path)

		checkAssertions(arr, this, path, errors)
	},

	extend(...newParts) {
		return extendModel(new ArrayModel(extendDefinition(this.definition, newParts)), this)
	}
})

let setArrayKey = (array, key, value, model) => {
	let path = `Array[${key}]`
	if (parseInt(key) >= 0)
		value = checkDefinition(value, model.definition, path, model.errors, [], true)

	let testArray = [...array]
	testArray[key] = value
	checkAssertions(testArray, model, path)
	let isSuccess = !unstackErrors(model)
	if (isSuccess) array[key] = value
	return isSuccess
}