Model[MAP] = function MapModel(def){

	const model = function(iterable) {
		const map = new Map(iterable);
		model[VALIDATE](map)

		for(let method of MAP_MUTATOR_METHODS){
			map[method] = function() {
				const testMap = new Map(map);
				Map[PROTO][method].apply(testMap, arguments)
				model[VALIDATE](testMap)
				return Map[PROTO][method].apply(map, arguments)
			}
		}

		setConstructor(map, model)
		return map;
	}

	setConstructorProto(model, Map[PROTO])
	initModel(model, def, Model[MAP])
	return model
}

setConstructorProto(Model[MAP], Model[PROTO])
Object.assign(Model[MAP][PROTO], {

	toString(stack){
		return MAP + ' of ' + toString(this[DEFINITION], stack)
	},

	[VALIDATOR](map, path, errorStack, callStack){
		if(map instanceof Map){
			for(let [key,val] of map){
				checkDefinition(val, this[DEFINITION], `${path||MAP}[${key}]`, errorStack, callStack)
			}
		} else {
			errorStack.push({
				[EXPECTED]: this,
				[RECEIVED]: map,
				[PATH]: path
			})
		}
		checkAssertions(map, this, errorStack)
	}
})
