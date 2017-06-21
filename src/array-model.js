import {extendModel, initModel, Model, stackError, unstackErrors} from "./model"
import {cast, checkAssertions, checkDefinition, extendDefinition, formatDefinition} from "./definition"
import {extend, isArray, isFunction, setConstructor} from "./helpers"

const ARRAY_MUTATORS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"]

export default function ArrayModel(def) {

	const model = function (array = model.default) {
		if (!model.validate(array)) return
		return new Proxy(array, {
			getPrototypeOf: () => model.prototype,

			get(arr, key) {
				let val = arr[key];
				if (!isFunction(val)) return val

				return new Proxy(val, {
					apply: (fn, ctx, args) => {
						if (ARRAY_MUTATORS.includes(key)) {
							const testArray = arr.slice()
							fn.apply(testArray, args)
							model.validate(testArray)
						}

						const returnValue = fn.apply(arr, args)
						array.forEach((a, i) => arr[i] = cast(a, model.definition))
						return returnValue
					}
				})
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

	_validate(arr, path, errors, stack){
		if (isArray(arr))
			arr.forEach((a, i) => {
				arr[i] = checkDefinition(a, this.definition, `${path || "Array"}[${i}]`, errors, stack, true)
			})
		else stackError(errors, this, arr, path)

		checkAssertions(arr, this, path, errors)
	},

	extend(...newParts){
		return extendModel(new ArrayModel(extendDefinition(this.definition, newParts)), this)
	}
})

function setArrayKey(array, key, value, model) {
	let path = `Array[${key}]`;
	if (parseInt(key) === +key && key >= 0)
		value = checkDefinition(value, model.definition, path, model.errors, [], true)

	const testArray = array.slice()
	testArray[key] = value
	checkAssertions(testArray, model, path)
	const isSuccess = !unstackErrors(model)
	if (isSuccess) array[key] = value
	return isSuccess
}