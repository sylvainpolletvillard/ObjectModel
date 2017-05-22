import { Model, initModel } from "./model"
import { checkDefinition, checkAssertions, cast } from "./definition"
import { is, setConstructorProto, toString } from "./helpers"

const MUTATOR_METHODS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"]

function ArrayModel(def){

	const model = function(array = model.default) {
		if(!is(model, this)) return new model(array)
		model.validate(array)
		return new Proxy(array, {
			getPrototypeOf: () => model.prototype,

			get(arr, key) {
				if (MUTATOR_METHODS.includes(key)) return proxifyMethod(arr, key, model)
				return arr[key]
			},

			set(arr, key, val) {
				return setArrayKey(arr, key, val, model)
			},

			deleteProperty(arr, key){
				return !(key in arr) || setArrayKey(arr, key, undefined, model)
			}
		})
	}

	setConstructorProto(model, Array.prototype)
	initModel(model, arguments, ArrayModel)
	return model
}

setConstructorProto(ArrayModel, Model.prototype)
Object.assign(ArrayModel.prototype, {

	toString(stack){
		return 'Array of ' + toString(this.definition, stack)
	},

	_validate(arr, path, errorStack, callStack){
		if(is(Array, arr))
			arr.forEach((a,i) => {
				arr[i] = checkDefinition(a, this.definition, `${path || "Array"}[${i}]`, errorStack, callStack, true)
			})
		else errorStack.push({
			expected: this,
			received: arr,
			path
		})

		checkAssertions(arr, this, path, errorStack)
	}
})

function proxifyMethod(array, method, model){
	return function() {
		const testArray = array.slice()
		Array.prototype[method].apply(testArray, arguments)
		model.validate(testArray)
		const returnValue = Array.prototype[method].apply(array, arguments)
		array.forEach((a,i)=> array[i] = cast(a, model.definition))
		return returnValue
	}
}

function setArrayKey(array, key, value, model){
	let path = `Array[${key}]`;
	if(parseInt(key) === +key && key >= 0)
		value = checkDefinition(value, model.definition, path, model.errorStack, [], true)

	const testArray = array.slice()
	testArray[key] = value
	checkAssertions(testArray, model, path)
	const isSuccess = !model.unstackErrors()
	if(isSuccess){
		array[key] = value
	}
	return isSuccess
}

export default ArrayModel