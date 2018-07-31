import { _validate, cast, checkAssertions, checkDefinition, extendDefinition, extendModel, formatDefinition, Model, stackError, unstackErrors } from "./object-model.js"
import { extend } from "./helpers.js"
import { initListModel } from "./list-model.js";

export default function ArrayModel(def) {
	let castAll = args => args.map(arg => cast(arg, def))

	let model = initListModel(
		Array,
		ArrayModel,
		def,
		a => Array.isArray(a) ? castAll(a) : a,
		a => [...a],
		{
			"copyWithin": 0,
			"fill": ([val, ...rest]) => [cast(val, def), ...rest],
			"pop": 0,
			"push": castAll,
			"reverse": 0,
			"shift": 0,
			"sort": 0,
			"splice": ([start, end, ...vals]) => [start, end, ...castAll(vals)],
			"unshift": castAll,
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
			arr.forEach((a, i) => {
				arr[i] = checkDefinition(a, this.definition, `${path || "Array"}[${i}]`, errors, stack)
			})
		else stackError(errors, this, arr, path)

		checkAssertions(arr, this, path, errors)
	},

	extend(...newParts) {
		return extendModel(new ArrayModel(extendDefinition(this.definition, newParts)), this)
	}
})

let setArrayKey = (array, key, value, model) => {
	let path = `Array[${key}]`;
	if (parseInt(key) === +key && key >= 0)
		value = checkDefinition(value, model.definition, path, model.errors, [])

	let testArray = [...array]
	testArray[key] = value
	checkAssertions(testArray, model, path)
	let isSuccess = !unstackErrors(model)
	if (isSuccess) array[key] = value
	return isSuccess
}