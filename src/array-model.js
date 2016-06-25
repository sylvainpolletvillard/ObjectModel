Model[ARRAY] = function ArrayModel(def){

	const model = function(array) {
		model[VALIDATE](array)
		const proxy = new Proxy(array, {
			get: function (arr, key) {
				return ARRAY_MUTATOR_METHODS.includes(key) ? proxifyArrayMethod(arr, key, model) : arr[key]
			},
			set: function (arr, key, val) {
				setArrayKey(arr, key, val, model)
			}
		})
		setConstructor(proxy, model)
		return proxy
	}

	setConstructorProto(model, Array[PROTO])
	initModel(model, def, Model[ARRAY])
	return model
}

setConstructorProto(Model[ARRAY], Model[PROTO])
Object.assign(Model[ARRAY][PROTO], {

	toString(stack){
		return ARRAY + ' of ' + toString(this[DEFINITION], stack)
	},

	[VALIDATOR](arr, path, callStack, errorStack){
		if(!Array.isArray(arr)){
			errorStack.push({
				[EXPECTED]: this,
				[RECEIVED]: arr,
				[PATH]: path
			})
		} else {
			arr.forEach((item,i) => checkDefinition(item, this[DEFINITION], (path||ARRAY)+'['+i+']', callStack, errorStack))
		}
		matchAssertions(arr, this[ASSERTIONS], this[ERROR_STACK])
	}
})

function proxifyArrayMethod(array, method, model){
	return function() {
		const testArray = array.slice()
		Array[PROTO][method].apply(testArray, arguments)
		model[VALIDATE](testArray)
		return Array[PROTO][method].apply(array, arguments)
	}
}

function setArrayKey(array, key, value, model){
	if(parseInt(key) === +key && key >= 0){
		checkDefinition(value, model[DEFINITION], ARRAY+'['+key+']', [], model[ERROR_STACK])
	}
	const testArray = array.slice()
	testArray[key] = value
	matchAssertions(testArray, model[ASSERTIONS], model[ERROR_STACK])
	model[UNSTACK_ERRORS]()
	array[key] = value
}