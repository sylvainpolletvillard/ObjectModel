function Model(def){
	if(!isLeaf(def)) return Model[OBJECT](def)

	const model = function(obj=model[DEFAULT]) {
		model[VALIDATE](obj)
		return obj
	}

	initModel(model, def, Model)
	return model
}

setConstructorProto(Model, Function[PROTO])

Object.assign(Model[PROTO], {
	toString(stack){
		return parseDefinition(this[DEFINITION]).map(d => toString(d, stack)).join(" or ")
	},

	[ASSERTIONS]: [],

	[VALIDATE](obj, errorCollector){
		this[VALIDATOR](obj, null, this[ERROR_STACK], [])
		this[UNSTACK_ERRORS](errorCollector)
	},

	[TEST](obj){
		const errorStack = []
		this[VALIDATOR](obj, null, errorStack, [])
		return !errorStack.length
	},

	[EXTEND](){
		let def, proto, assertions = [...this[ASSERTIONS]]
		const args = [...arguments]

		if(is(Model[OBJECT], this)){
			def = {}
			proto = {}
			Object.assign(def, this[DEFINITION])
			Object.assign(proto, this[PROTO])
			args.forEach(arg => {
				if(is(Model, arg)){
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
			if(is(Model, arg)) assertions = assertions.concat(arg[ASSERTIONS])
		})

		const submodel = new this[CONSTRUCTOR](def)
		setConstructorProto(submodel, this[PROTO])
		Object.assign(submodel[PROTO], proto)
		submodel[ASSERTIONS] = assertions
		submodel[ERROR_COLLECTOR] = this[ERROR_COLLECTOR]
		return submodel
	},

	assert(assertion, description = toString(assertion)){
		const onFail = isFunction(description) ? description : (assertionResult, value) =>
			`assertion "${description}" returned ${toString(assertionResult)} for value ${toString(value)}`
		define(assertion, ON_FAIL, onFail)
		this[ASSERTIONS] = this[ASSERTIONS].concat(assertion)
		return this
	},

	defaultTo(val){
		this[DEFAULT] = val;
		return this;
	},

	[ERROR_COLLECTOR](errors){
		throw new TypeError(errors.map(function(e){ return e[MESSAGE] }).join('\n'))
	},

	[VALIDATOR](obj, path, errorStack, callStack){
		checkDefinition(obj, this[DEFINITION], path, errorStack, callStack)
		checkAssertions(obj, this, errorStack)
	},

	// throw all errors collected
	[UNSTACK_ERRORS](errorCollector){
		if (!this[ERROR_STACK].length) return
		if (!errorCollector) errorCollector = this.errorCollector
		const errors = this[ERROR_STACK].map(err => {
			if (!err[MESSAGE]) {
				const def = is(Array, err[EXPECTED]) ? err[EXPECTED] : [err[EXPECTED]]
				err[MESSAGE] = ("expecting " + (err[PATH] ? err[PATH] + " to be " : "") + def.map(d => toString(d)).join(" or ")
				+ ", got " + (err[RECEIVED] != null ? bettertypeof(err[RECEIVED]) + " " : "") + toString(err[RECEIVED]))
			}
			return err
		})
		this[ERROR_STACK] = []
		errorCollector.call(this, errors)
	}

})

Model[CONVENTION_CONSTANT] = key => key.toUpperCase() === key
Model[CONVENTION_PRIVATE] = key => key[0] === "_"

const isLeaf = def => bettertypeof(def) != "Object"

function initModel(model, def, constructor){
	setConstructor(model, constructor)
	model[DEFINITION] = def
	model[ASSERTIONS] = model[ASSERTIONS].slice();
	define(model, ERROR_STACK, [])
}

function parseDefinition(def){
	if(isLeaf(def)){
		if(!is(Array, def)) return [def]
		else if(def.length === 1) return [...def, undefined, null]
	} else {
		for(let key of def) def[key] = parseDefinition(def[key])
	}
	return def
}

function checkDefinition(obj, def, path, errorStack, callStack){
	if(is(Model, def)){
		const indexFound = callStack.indexOf(def)
		//if found twice in call stack, cycle detected, skip validation
		if(indexFound !== -1 && callStack.indexOf(def, indexFound+1) !== -1) return
		return def[VALIDATOR](obj, path, errorStack, callStack.concat(def))
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
		Object.keys(def).forEach(key => {
			const val = obj != null ? obj[key] : undefined
			checkDefinition(val, def[key], path ? path + '.' + key : key, errorStack, callStack)
		})
	}
}

function checkDefinitionPart(obj, def, path, callStack){
	if(obj == null) return obj === def
	if(!isLeaf(def) || is(Model, def)){ // object or model as part of union type
		const errorStack = []
		checkDefinition(obj, def, path, errorStack, callStack)
		return !errorStack.length
	}
	if(is(RegExp, def)) return def[TEST](obj)
	if(def === Number || def === Date) return obj[CONSTRUCTOR] === def && !isNaN(obj)
	return obj === def
		|| (isFunction(def) && is(def, obj))
		|| obj[CONSTRUCTOR] === def
}

function checkAssertions(obj, model, errorStack = model[ERROR_STACK]){
	for(let assertion of model[ASSERTIONS]){
		let assertionResult;
		try {
			assertionResult = assertion.call(model, obj)
		} catch(err){
			assertionResult = err
		}
		if(assertionResult !== true){
			errorStack.push({
				[MESSAGE]: assertion[ON_FAIL].call(model, assertionResult, obj)
			})
		}
	}
}