import {
	_original, _check, cast, checkAssertions, checkDefinition,
	extendDefinition, extendModel, formatDefinition, Model, stackError, unstackErrors
} from "./object-model.js"
import { initListModel } from "./list-model.js"
import { extend } from "./helpers.js"

export default function ArrayModel(initialDefinition) {
	const model = initListModel(
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
				return controlMutation(model, arr, key, val, (a, v) => a[key] = v, true)
			},

			deleteProperty(arr, key) {
				return controlMutation(model, arr, key, undefined, a => delete a[key])
			}
		}
	)

	return model
}

extend(ArrayModel, Model, {
	toString(stack) {
		return "Array of " + formatDefinition(this.definition, stack)
	},

	[_check](arr, path, errors, stack, shouldCast) {
		if (Array.isArray(arr))
			(arr[_original] || arr).forEach((a, i) => checkDefinition(a, this.definition, `${path || "Array"}[${i}]`, errors, stack, shouldCast))
		else stackError(errors, this, arr, path)

		checkAssertions(arr, this, path, errors)
	},

	extend(...newParts) {
		return extendModel(new ArrayModel(extendDefinition(this.definition, newParts)), this)
	}
})

const controlMutation = (model, array, key, value, applyMutation, canBeExtended) => {
	const path = `Array[${key}]`
	const isInDef = (+key >= 0 && (canBeExtended || key in array))
	if (isInDef) value = checkDefinition(value, model.definition, path, model.errors, [], true)

	const testArray = [...array]
	applyMutation(testArray)
	checkAssertions(testArray, model, path)
	const isSuccess = !unstackErrors(model)
	if (isSuccess) applyMutation(array, value)
	return isSuccess
}