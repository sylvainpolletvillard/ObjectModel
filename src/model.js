function Model(def){
	if(isPlainObject(def)) return Model[OBJECT](def)

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
		let failed,
		    initialErrorCollector = this[ERROR_COLLECTOR]
		this[ERROR_COLLECTOR] = () => { failed = true }
		this(obj)
		this[ERROR_COLLECTOR] = initialErrorCollector
		return !failed;
	},

	[EXTEND](){
		let def, proto, assertions = [...this[ASSERTIONS]]
		const args = [...arguments]

		if(is(Model[OBJECT], this)){
			def = {}
			proto = {}
			Object.assign(def, this[DEFINITION])
			merge(proto, this[PROTO], false, true)
			args.forEach(arg => {
				if(is(Model, arg)){
					merge(def, arg[DEFINITION], true)
				}
				if(isFunction(arg)){
					merge(proto, arg[PROTO], true, true);
				}
				if(isObject(arg)) {
					merge(def, arg, true, true);
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

	[ASSERT](assertion, description = toString(assertion)){
		const onFail = isFunction(description) ? description : (assertionResult, value) =>
			`assertion "${description}" returned ${toString(assertionResult)} for value ${toString(value)}`
		define(assertion, ON_FAIL, onFail)
		this[ASSERTIONS] = this[ASSERTIONS].concat(assertion)
		return this
	},

	[DEFAULT_TO](val){
		this[DEFAULT] = val;
		return this;
	},

	[ERROR_COLLECTOR](errors){
		let e = new TypeError(errors.map(e => e[MESSAGE]).join('\n'))
		e.stack = e.stack.replace(STACKTRACE_BLACKBOX_MATCHER, "");
		throw e;
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

function initModel(model, def, constructor){
	setConstructor(model, constructor)
	model[DEFINITION] = def
	model[ASSERTIONS] = model[ASSERTIONS].slice();
	define(model, ERROR_STACK, [])
}

function parseDefinition(def){
	if(!isPlainObject(def)){
		if(!is(Array, def)) return [def]
		if(def.length === 1) return [...def, undefined, null]
	} else {
		for(let key of Object.keys(def))
			def[key] = parseDefinition(def[key])
	}
	return def
}

function checkDefinition(obj, def, path, errorStack, callStack, shouldAutoCast=false){
	const indexFound = callStack.indexOf(def)
	if(indexFound !== -1 && callStack.indexOf(def, indexFound+1) !== -1)
		return obj; //if found twice in call stack, cycle detected, skip validation

	if(shouldAutoCast)
		obj = autocast(obj, def)


	if(is(Model, def)){
		def[VALIDATOR](obj, path, errorStack, callStack.concat(def))
	}
	else if(isPlainObject(def)){
		Object.keys(def).forEach(key => {
			const val = obj != null ? obj[key] : undefined
			checkDefinition(val, def[key], path ? path + '.' + key : key, errorStack, callStack)
		})
	}
	else {
		const pdef = parseDefinition(def)
		if(pdef.some(part => checkDefinitionPart(obj, part, path, callStack)))
			return obj

		errorStack.push({
			[EXPECTED]: def,
			[RECEIVED]: obj,
			[PATH]: path
		})
	}

	return obj
}

function checkDefinitionPart(obj, def, path, callStack){
	if(obj == null) return obj === def
	if(isPlainObject(def) || is(Model, def)){ // object or model as part of union type
		const errorStack = []
		checkDefinition(obj, def, path, errorStack, callStack)
		return !errorStack.length
	}
	if(is(RegExp, def)) return def.test(obj)
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

function autocast(obj, defNode=[]) {
	if(!obj || isPlainObject(defNode) || is(Model, obj[CONSTRUCTOR]))
		return obj; // no value or not leaf or already a model instance

	const def = parseDefinition(defNode),
	      suitableModels = []

	for (let part of def) {
		if(is(Model, part) && part[TEST](obj))
			suitableModels.push(part)
	}

	if (suitableModels.length === 1)
		return suitableModels[0](obj); // automatically cast to suitable model when explicit

	if (suitableModels.length > 1)
		console.warn(`Ambiguous model for value ${toString(obj)},
			 could be ${suitableModels.join(" or ")}`)

	return obj
}