Model[SET] = function SetModel(def){

	const model = function(iterable) {
		const _set = new Set(iterable);
		model[VALIDATE](_set)

		for(let method of SET_MUTATOR_METHODS){
			_set[method] = function() {
				const testSet = new Set(_set);
				Set[PROTO][method].apply(testSet, arguments)
				model[VALIDATE](testSet)
				return Set[PROTO][method].apply(_set, arguments)
			}
		}

		setConstructor(_set, model)
		return _set;
	}

	setConstructorProto(model, Set[PROTO])
	initModel(model, def, Model[SET])
	return model
}

setConstructorProto(Model[SET], Model[PROTO])
Object.assign(Model[SET][PROTO], {

	toString(stack){
		return SET + ' of ' + toString(this[DEFINITION], stack)
	},

	[VALIDATOR](_set, path, errorStack, callStack){
		if(_set instanceof Set){
			for(let item of _set.values()){
				checkDefinition(item, this[DEFINITION], (path||SET), errorStack, callStack)
			}
		} else {
			errorStack.push({
				[EXPECTED]: this,
				[RECEIVED]: _set,
				[PATH]: path
			})
		}
		checkAssertions(_set, this, errorStack)
	}
})
