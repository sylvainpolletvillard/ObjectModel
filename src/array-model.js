import {_original, _validate, cast, checkAssertions, checkDefinition, extendDefinition, extendModel, formatDefinition, initModel, Model, stackError, unstackErrors} from "./object-model.js"
import {extend, isArray, isFunction, proxifyFn, proxifyModel, setConstructor} from "./helpers.js"

let ARRAY_MUTATORS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"]

export default function ArrayModel(def) {

	let model = function (array = model.default) {
		if (model.validate(array)) return proxifyModel(array, model, {
			get(arr, key) {
				if(key === _original) return arr

				let val = arr[key];
				return isFunction(val) ? proxifyFn(val, (fn, ctx, args) => {
					if (ARRAY_MUTATORS.includes(key)) {
						let testArray = arr.slice()
						fn.apply(testArray, args)
						model.validate(testArray)
					}

					let returnValue = fn.apply(arr, args)
					array.forEach((a, i) => arr[i] = cast(a, model.definition))
					return returnValue
				}) : val
			},

			set(arr, key, val) {
				return setArrayKey(arr, key, val, model)
			},

			deleteProperty(arr, key){
				return !(key in arr) || setArrayKey(arr, key, undefined, model)
			}
		})
	}

	extend(model, Array)
	setConstructor(model, ArrayModel)
	initModel(model, def)
	return model
}

extend(ArrayModel, Model, {
	toString(stack){
		return 'Array of ' + formatDefinition(this.definition, stack)
	},

	[_validate](arr, path, errors, stack){
		if (isArray(arr))
			arr.forEach((a, i) => {
				arr[i] = checkDefinition(a, this.definition, `${path || "Array"}[${i}]`, errors, stack)
			})
		else stackError(errors, this, arr, path)

		checkAssertions(arr, this, path, errors)
	},

	extend(...newParts){
		return extendModel(new ArrayModel(extendDefinition(this.definition, newParts)), this)
	}
})

let setArrayKey = (array, key, value, model) => {
	let path = `Array[${key}]`;
	if (parseInt(key) === +key && key >= 0)
		value = checkDefinition(value, model.definition, path, model.errors, [])

	let testArray = array.slice()
	testArray[key] = value
	checkAssertions(testArray, model, path)
	let isSuccess = !unstackErrors(model)
	if (isSuccess) array[key] = value
	return isSuccess
}