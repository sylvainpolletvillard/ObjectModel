Model[ARRAY] = function ArrayModel(def){

	const model = function(array = model[DEFAULT]) {
		model[VALIDATE](array)
		return new Proxy(array, {
			get(arr, key) {
				if (key === CONSTRUCTOR)
					return model
				else if (ARRAY_MUTATOR_METHODS.includes(key))
					return proxifyArrayMethod(arr, key, model)
				return arr[key]
			},
			set(arr, key, val) {
				setArrayKey(arr, key, val, model)
			},
			getPrototypeOf(){
				return model[PROTO];
			}
		})
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

	[VALIDATOR](arr, path, errorStack, callStack){
		if(is(Array, arr))
			arr.forEach((a,i) => {
				arr[i] = checkDefinition(a, this[DEFINITION], `${path || ARRAY}[${i}]`, errorStack, callStack, true)
			})
		else errorStack.push({
			[EXPECTED]: this,
			[RECEIVED]: arr,
			[PATH]: path
		})

		checkAssertions(arr, this, errorStack)
	}
})

function proxifyArrayMethod(array, method, model){
	return function() {
		const testArray = array.slice()
		Array[PROTO][method].apply(testArray, arguments)
		model[VALIDATE](testArray)
		const returnValue = Array[PROTO][method].apply(array, arguments)
		array.forEach((a,i)=> array[i] = autocast(a, model[DEFINITION]))
		return returnValue
	}
}

function setArrayKey(array, key, value, model){
	if(parseInt(key) === +key && key >= 0)
		value = checkDefinition(value, model[DEFINITION], ARRAY+'['+key+']', model[ERROR_STACK], [], true)

	const testArray = array.slice()
	testArray[key] = value
	checkAssertions(testArray, model)
	model[UNSTACK_ERRORS]()
	array[key] = value
}