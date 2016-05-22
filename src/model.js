function Model(def){
	if(!isLeaf(def)) return Model[OBJECT](def)

	const model = function(obj) {
		model[VALIDATE](obj)
		return obj
	}

	initModel(model, def, Model)
	return model
}

setConstructorProto(Model, Function[PROTO])
const ModelProto = Model[PROTO]

ModelProto.toString = stack => parseDefinition(this[DEFINITION]).map(d => toString(d, stack)).join(" or ")

ModelProto[VALIDATE] = function(obj, errorCollector){
	this[VALIDATOR](obj, null, [], this[ERROR_STACK])
	this[UNSTACK](errorCollector)
}

ModelProto[TEST] = function(obj){
	const errorStack = []
	this[VALIDATOR](obj, null, [], errorStack)
	return !errorStack.length
}

ModelProto[EXTEND] = function(){
	let def, proto, assertions = [...this[ASSERTIONS]]
	const args = [...arguments]

	if(this instanceof Model[OBJECT]){
		def = {}
		proto = {}
		Object.assign(def, this[DEFINITION])
		Object.assign(proto, this[PROTO])
		args.forEach(arg => {
			if(arg instanceof Model){
				deepAssign(def, arg[DEFINITION])
				deepAssign(proto, arg[PROTO])
			} else {
				deepAssign(def, arg)
			}
		})
	} else {
		def = args
			.reduce((def, ext) => def.concat(parseDefinition(ext)), parseDefinition(this[DEFINITION]))
			.filter((value, index, self) => self.indexOf(value) === index) // remove duplicates
	}

	args.forEach(arg => {
		if(arg instanceof Model) assertions = assertions.concat(arg[ASSERTIONS])
	})

	var submodel = new this[CONSTRUCTOR](def)
	setConstructorProto(submodel, this[PROTO])
	Object.assign(submodel[PROTO], proto)
	submodel[ASSERTIONS] = assertions
	return submodel
}

ModelProto.assert = function(assertion, message){
	define(assertion, DESCRIPTION, message)
	this[ASSERTIONS].push(assertion)
	return this
}

ModelProto.errorCollector = errors => {
	throw new TypeError(errors.map(function(e){ return e[MESSAGE] }).join('\n'))
}

Model[CONVENTION_CONSTANT] = key => key.toUpperCase() === key
Model[CONVENTION_PRIVATE] = key => key[0] === "_"

// private methods
define(ModelProto, VALIDATOR, function(obj, path, callStack, errorStack){
	checkDefinition(obj, this[DEFINITION], path, callStack, errorStack)
	matchAssertions(obj, this[ASSERTIONS], errorStack)
})

// throw all errors collected
define(ModelProto, UNSTACK, function(errorCollector){
	if(!this[ERROR_STACK].length) return
	if(!errorCollector) errorCollector = this.errorCollector
	const errors = this[ERROR_STACK].map(err => {
		if(!err[MESSAGE]){
			const def = Array.isArray(err[EXPECTED]) ? err[EXPECTED] : [err[EXPECTED]]
			err[MESSAGE] = ("expecting " + (err[PATH] ? err[PATH] + " to be " : "") + def.map(d => toString(d)).join(" or ")
			+ ", got " + (err[RECEIVED] != null ? bettertypeof(err[RECEIVED]) + " " : "") + toString(err[RECEIVED]))
		}
		return err
	})
	this[ERROR_STACK] = []
	errorCollector.call(this, errors)
})

const isLeaf = def => bettertypeof(def) != "Object"

function initModel(model, def, constructor){
	setConstructor(model, constructor)
	model[DEFINITION] = def
	model[ASSERTIONS] = []
	define(model, ERROR_STACK, [])
}

function parseDefinition(def){
	if(isLeaf(def)){
		if(!Array.isArray(def)) return [def]
		else if(def.length === 1) return [...def, undefined, null]
	} else {
		for(let key of def) def[key] = parseDefinition(def[key])
	}
	return def
}

function checkDefinition(obj, def, path, callStack, errorStack){
	if(def instanceof Model){
		const indexFound = callStack.indexOf(def)
		//if found twice in call stack, cycle detected, skip validation
		if(indexFound !== -1 && callStack.indexOf(def, indexFound+1) !== -1) return
		return def[VALIDATOR](obj, path, callStack.concat(def), errorStack)
	}
	else if(isLeaf(def)){
		const pdef = parseDefinition(def)
		if(pdef.some(part => checkDefinitionPart(obj, part, path, callStack))) return
		errorStack.push({
			[EXPECTED]: def,
			[RECEIVED]: obj,
			[PATH]: path
		})
	} else {
		O.keys(def).forEach(key => {
			const val = obj != null ? obj[key] : undefined
			checkDefinition(val, def[key], path ? path + '.' + key : key, callStack, errorStack)
		})
	}
}

function checkDefinitionPart(obj, def, path, callStack){
	if(obj == null) return obj === def
	if(!isLeaf(def) || def instanceof Model){ // object or model as part of union type
		const errorStack = []
		checkDefinition(obj, def, path, callStack, errorStack)
		return !errorStack.length
	}
	if(def instanceof RegExp) return def[TEST](obj)
	return obj === def
		|| (isFunction(def) && obj instanceof def)
		|| obj[CONSTRUCTOR] === def
}

function matchAssertions(obj, assertions, errorStack){
	for(let assertion of assertions){
		if(!assertion(obj)){
			errorStack.push({
				[MESSAGE]: `assertion failed: ${assertion[DESCRIPTION] || toString(assertion)}`
			})
		}
	}
}