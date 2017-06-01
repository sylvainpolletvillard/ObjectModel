import {bettertypeof, define, extend, is, isPlainObject, toString} from "./helpers"
import {checkAssertions, checkDefinition, parseDefinition} from "./definition"
import BasicModel from "./basic-model"
import ObjectModel from "./object-model"


export function Model(def){
	return isPlainObject(def) ? ObjectModel(def) : BasicModel(def)
}

Object.assign(Model.prototype, {
	name: "Model",
	assertions: [],

	conventionForConstant: key => key.toUpperCase() === key,
	conventionForPrivate: key => key[0] === "_",

	toString(stack){
		return parseDefinition(this.definition).map(d => toString(d, stack)).join(" or ")
	},

	as(name){
		define(this, "name", name);
		return this
	},

	defaultTo(val){
		this.default = val
		return this
	},

	_init(args){
		if(args.length === 0) throw new Error("Model definition is required");
		this.definition = args[0]
		this.assertions = this.assertions.slice()
		define(this, "errorStack", [])
		delete this.name;
	},

	_validate(obj, path, errorStack, callStack){
		checkDefinition(obj, this.definition, path, errorStack, callStack)
		checkAssertions(obj, this, path, errorStack)
	},

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
	},

	errorCollector(errors){
		let e = new TypeError(errors.map(e => e.message).join('\n'))
		e.stack = e.stack.replace(/\n.*object-model(.|\n)*object-model.*/, "") // blackbox objectmodel in stacktrace
		throw e
	},

	extend(...newParts){
		let def = this.definition;
		if(newParts.length > 0){
			def = newParts
				.reduce((def, ext) => def.concat(ext), Array.isArray(def) ? def.slice() : [def]) // clone to lose ref
				.filter((value, index, self) => self.indexOf(value) === index) // remove duplicates
		}

		let assertions = [...this.assertions]
		newParts.forEach(part => {
			if(is(BasicModel, part)) assertions = assertions.concat(part.assertions)
		})

		const submodel = new this.constructor(def)
		extend(submodel, this)
		submodel.assertions = assertions
		submodel.errorCollector = this.errorCollector
		return submodel
	},

	assert(assertion, description = toString(assertion)){
		define(assertion, "description", description);
		this.assertions = this.assertions.concat(assertion)
		return this
	}
})

export default Model;