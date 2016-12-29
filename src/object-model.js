Model[OBJECT] = function ObjectModel(def){

	const model = function(obj = model[DEFAULT]) {
		if(is(model, obj)) return obj;
		if(!is(model, this)) return new model(obj)
		merge(this, obj, true)
		const proxy = getProxy(model, this, model[DEFINITION])
		model[VALIDATE](proxy)
		return proxy
	}

	setConstructorProto(model, Object[PROTO])
	initModel(model, def, Model[OBJECT])
	return model
}

setConstructorProto(Model[OBJECT], Model[PROTO])

Object.assign(Model[OBJECT][PROTO], {

	[DEFAULTS](p){
		Object.assign(this[PROTO], p)
		return this
	},

	toString(stack){
		return toString(this[DEFINITION], stack)
	},

	[VALIDATOR](obj, path, errorStack, callStack){
		if(!isObject(obj)){
			errorStack.push({
				[EXPECTED]: this,
				[RECEIVED]: obj,
				[PATH]: path
			})
		} else {
			checkDefinition(obj, this[DEFINITION], path, errorStack, callStack)
		}
		checkAssertions(obj, this, errorStack)
	}
})

function getProxy(model, obj, defNode, path) {
	if(!isPlainObject(defNode)) {
		return autocast(obj, defNode);
	}

	return new Proxy(obj || {}, {
		get(o, key) {
			const newPath = (path ? path + '.' + key : key);
			return getProxy(model, o[key], defNode[key], newPath);
		},
		set(o, key, val) {
			const newPath = (path ? path + '.' + key : key),
				  isConstant = Model[CONVENTION_CONSTANT](key),
				  initialValue = o[key];
			
			if(isConstant && initialValue !== undefined){
				model[ERROR_STACK].push({
					[MESSAGE]: `cannot redefine constant ${key}`
				})
			}
			if(defNode.hasOwnProperty(key)){
				const newProxy = getProxy(model, val, defNode[key], newPath)
				checkDefinition(newProxy, defNode[key], newPath, model[ERROR_STACK], [])
				o[key] = newProxy
				checkAssertions(obj, model)
			} else {
				model[ERROR_STACK].push({
					[MESSAGE]: `cannot find property ${newPath} in the model definition`
				})
			}
		
			if(model[ERROR_STACK].length){
				o[key] = initialValue
				model[UNSTACK_ERRORS]()
			}
		},
		has(o, key){
			return Reflect.has(o, key) && !Model[CONVENTION_PRIVATE](key)
		},
		ownKeys(o){
			return Reflect.ownKeys(o).filter(key => !Model[CONVENTION_PRIVATE](key))
		},
		getPrototypeOf(){
			return model[PROTO];
		}
	});
}