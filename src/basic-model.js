import {
	bettertypeof,
	define,
	is, isFunction, isPlainObject,
	setConstructor,
	setConstructorProto,
	toString
} from "./helpers"

export function BasicModel(def){
	const model = function(obj = model.default) {
		model.validate(obj)
		return obj
	}

	initModel(model, def, BasicModel)
	return model
}

setConstructorProto(BasicModel, Function.prototype)

Object.assign(BasicModel.prototype, {
	toString(stack){
		return parseDefinition(this.definition).map(d => toString(d, stack)).join(" or ")
	},

	assertions: [],

	validate(obj, errorCollector){
		this._validate(obj, null, this.errorStack, [])
		this.unstackErrors(errorCollector)
	},

	test(obj){
		let failed,
		    initialErrorCollector = this.errorCollector
		this.errorCollector = () => { failed = true }
		this(obj)
		this.errorCollector = initialErrorCollector
		return !failed
	},

	extend(){
		const args = [...arguments]
		const def = args
			.reduce((def, ext) => def.concat(parseDefinition(ext)), parseDefinition(this.definition))
			.filter((value, index, self) => self.indexOf(value) === index) // remove duplicates

		let assertions = [...this.assertions]
		args.forEach(arg => {
			if(is(BasicModel, arg)) assertions = assertions.concat(arg.assertions)
		})

		const submodel = new this.constructor(def)
		setConstructorProto(submodel, this.prototype)
		submodel.assertions = assertions
		submodel.errorCollector = this.errorCollector
		return submodel
	},

	assert(assertion, description = toString(assertion)){
		assertion.description = description
		this.assertions = this.assertions.concat(assertion)
		return this
	},

	defaultTo(val){
		this.default = val
		return this
	},

	errorCollector(errors){
		let e = new TypeError(errors.map(e => e.message).join('\n'))
		e.stack = e.stack.replace(/\n.*object-model(.|\n)*object-model.*/, "") // blackbox objectmodel in stacktrace
		throw e
	},

	_validate(obj, path, errorStack, callStack){
		checkDefinition(obj, this.definition, path, errorStack, callStack)
		checkAssertions(obj, this, errorStack)
	},

	// throw all errors collected
	unstackErrors(errorCollector){
		if (!this.errorStack.length) return
		if (!errorCollector) errorCollector = this.errorCollector
		const errors = this.errorStack.map(err => {
			if (!err.message) {
				const def = is(Array, err.expected) ? err.expected : [err.expected]
				err.message = ("expecting " + (err.path ? err.path + " to be " : "") + def.map(d => toString(d)).join(" or ")
				+ ", got " + (err.received != null ? bettertypeof(err.received) + " " : "") + toString(err.received))
			}
			return err
		})
		this.errorStack = []
		errorCollector.call(this, errors)
	}

})

BasicModel.prototype.conventionForConstant = key => key.toUpperCase() === key
BasicModel.prototype.conventionForPrivate = key => key[0] === "_"

export function initModel(model, def, constructor){
	setConstructor(model, constructor)
	model.definition = def
	model.assertions = model.assertions.slice()
	define(model, "errorStack", [])
}

export function parseDefinition(def){
	if(!isPlainObject(def)){
		if(!is(Array, def)) return [def]
		if(def.length === 1) return [...def, undefined, null]
	} else {
		for(let key of Object.keys(def))
			def[key] = parseDefinition(def[key])
	}
	return def
}

export function checkDefinition(obj, def, path, errorStack, callStack, shouldAutoCast=false){
	const indexFound = callStack.indexOf(def)
	if(indexFound !== -1 && callStack.indexOf(def, indexFound+1) !== -1)
		return obj //if found twice in call stack, cycle detected, skip validation

	if(shouldAutoCast)
		obj = autocast(obj, def)


	if(is(BasicModel, def)){
		def._validate(obj, path, errorStack, callStack.concat(def))
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
			expected: def,
			received: obj,
			path
		})
	}

	return obj
}

export function checkDefinitionPart(obj, def, path, callStack){
	if(obj == null) return obj === def
	if(isPlainObject(def) || is(BasicModel, def)){ // object or model as part of union type
		const errorStack = []
		checkDefinition(obj, def, path, errorStack, callStack)
		return !errorStack.length
	}
	if(is(RegExp, def)) return def.test(obj)
	if(def === Number || def === Date) return obj.constructor === def && !isNaN(obj)
	return obj === def
		|| (isFunction(def) && is(def, obj))
		|| obj.constructor === def
}

export function checkAssertions(obj, model, errorStack = model.errorStack){
	for(let assertion of model.assertions){
		let assertionResult
		try {
			assertionResult = assertion.call(model, obj)
		} catch(err){
			assertionResult = err
		}
		if(assertionResult !== true){
			const onFail = isFunction(assertion.description) ? assertion.description : (assertionResult, value) =>
				`assertion "${assertion.description}" returned ${toString(assertionResult)} for value ${toString(value)}`
			errorStack.push({
				message: onFail.call(model, assertionResult, obj)
			})
		}
	}
}

export function autocast(obj, defNode=[]) {
	if(!obj || isPlainObject(defNode) || is(BasicModel, obj.constructor))
		return obj // no value or not leaf or already a model instance

	const def = parseDefinition(defNode),
	      suitableModels = []

	for (let part of def) {
		if(is(BasicModel, part) && part.test(obj))
			suitableModels.push(part)
	}

	if (suitableModels.length === 1)
		return suitableModels[0](obj) // automatically cast to suitable model when explicit

	if (suitableModels.length > 1)
		console.warn(`Ambiguous model for value ${toString(obj)}, could be ${suitableModels.join(" or ")}`)

	return obj
}

export default BasicModel