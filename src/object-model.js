Model[OBJECT] = function ObjectModel(def){

	const model = function(obj) {
		if(!(this instanceof model)) return new model(obj)
		deepAssign(this, obj)
		const proxy = getProxy(model, this, model[DEFINITION])
		model[VALIDATE](proxy)
		return proxy
	}

	setConstructorProto(model, O[PROTO])
	initModel(model, def, Model[OBJECT])
	return model
}

setConstructorProto(Model[OBJECT], ModelProto)
const ObjectModelProto = Model[OBJECT][PROTO]

ObjectModelProto[DEFAULTS] = function(p){
	Object.assign(this[PROTO], p)
	return this
}

ObjectModelProto.toString = function(stack){
	return toString(this[DEFINITION], stack)
}

// private methods
define(ObjectModelProto, VALIDATOR, function(obj, path, callStack, errorStack){
	if(!isObject(obj)){
		errorStack.push({
			[EXPECTED]: this,
			[RECEIVED]: obj,
			[PATH]: path
		})
	} else {
		checkDefinition(obj, this[DEFINITION], path, callStack, errorStack)
	}
	matchAssertions(obj, this[ASSERTIONS], this[ERROR_STACK])
})

function getProxy(model, obj, defNode, path) {
	if(defNode instanceof Model && obj && !(obj instanceof defNode)) return defNode(obj)
	else if(isLeaf(defNode)) return obj
	else {
		const wrapper = obj instanceof O ? obj : {},
			  proxy = O.create(O.getPrototypeOf(wrapper))

		for(var key in wrapper){
			if(wrapper.hasOwnProperty(key) && !(key in defNode)){
				proxy[key] = wrapper[key] // properties out of model definition are kept
			}
		}

		O.keys(defNode).forEach(key => {
			const newPath = (path ? path + '.' + key : key),
			      isConstant = Model[CONVENTION_CONSTANT](key)
			defineProperty(proxy, key, {
				get: () => getProxy(model, wrapper[key], defNode[key], newPath),
				set: val => {
					if(isConstant && wrapper[key] !== undefined){
						model[ERROR_STACK].push({
							[MESSAGE]: `cannot redefine constant ${key}`
						})
					}
					const newProxy = getProxy(model, val, defNode[key], newPath)
					checkDefinition(newProxy, defNode[key], newPath, [], model[ERROR_STACK])
					const oldValue = wrapper[key]
					wrapper[key] = newProxy
					matchAssertions(obj, model[ASSERTIONS], model[ERROR_STACK])
					if(model[ERROR_STACK].length){
						wrapper[key] = oldValue
						model[UNSTACK]()
					}
				},
				enumerable: !Model[CONVENTION_PRIVATE](key)
			})
		})
		return proxy
	}
}