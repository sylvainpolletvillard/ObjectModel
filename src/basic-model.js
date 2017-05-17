import {
	bettertypeof,
	define,
	is, isPlainObject,
	setConstructor,
	setConstructorProto,
	toString
} from "./helpers"

import {checkDefinition, checkAssertions} from "./definition"

export function BasicModel(def){
	const model = function(val = model.default) {
		model.validate(val)
		return val
	}

	initModel(model, arguments, BasicModel)
	return model
}

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
		new this(obj)
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
		define(assertion, "description", description);
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
		checkAssertions(obj, this, path, errorStack)
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

export function initModel(model, args, constructor){
	if(args.length === 0) throw new Error("Model definition is required");
	setConstructor(model, constructor)
	model.definition = args[0]
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




export default BasicModel