import {_constructor, _validate, bettertypeof, define, extend, getProto, is, isArray, isPlainObject} from "./helpers.js"
import {format} from "./formatter.js"
import {checkAssertions, checkDefinition, formatDefinition} from "./definition.js"
import BasicModel from "./basic-model.js"
import ObjectModel from "./object-model.js"

export function Model(def, params) {
	return isPlainObject(def) ? new ObjectModel(def, params) : new BasicModel(def)
}

Object.assign(Model.prototype, {
	name: "Model",
	assertions: [],

	conventionForConstant: key => key.toUpperCase() === key,
	conventionForPrivate: key => key[0] === "_",

	toString(stack){
		return formatDefinition(this.definition, stack)
	},

	as(name){
		define(this, "name", name);
		return this
	},

	defaultTo(val){
		this.default = val
		return this
	},

	[_constructor]: o => o,

	[_validate](obj, path, errors, stack){
		checkDefinition(obj, this.definition, path, errors, stack)
		checkAssertions(obj, this, path, errors)
	},

	validate(obj, errorCollector){
		this[_validate](obj, null, this.errors, [])
		return !unstackErrors(this, errorCollector)
	},

	test(obj){
		let failed,
		    initialErrorCollector = this.errorCollector

		this.errorCollector = () => {
			failed = true
		}

		new this(obj) // may trigger this.errorCollector

		this.errorCollector = initialErrorCollector
		return !failed
	},

	errorCollector(errors){
		let e = new TypeError(errors.map(e => e.message).join('\n'))
		e.stack = e.stack.replace(/\n.*object-model(.|\n)*object-model.*/, "") // blackbox objectmodel in stacktrace
		throw e
	},

	assert(assertion, description = format(assertion)){
		define(assertion, "description", description);
		this.assertions = this.assertions.concat(assertion)
		return this
	}
})

export let initModel = (model, def) => {
	model.definition = def
	model.assertions = [...model.assertions]
	define(model, "errors", [])
	delete model.name;
}

export let extendModel = (child, parent, newProps) => {
	extend(child, parent, newProps)
	child.assertions.push(...parent.assertions)
	return child
}

export let stackError = (errors, expected, received, path, message) => {
	errors.push({expected, received, path, message})
}

export let unstackErrors = (model, errorCollector = model.errorCollector) => {
	let nbErrors = model.errors.length
	if (nbErrors > 0) {
		let errors = model.errors.map(err => {
			if (!err.message) {
				let def = isArray(err.expected) ? err.expected : [err.expected]
				err.message = "expecting " + (err.path ? err.path + " to be " : "") + def.map(d => format(d)).join(" or ")
					+ ", got " + (err.received != null ? bettertypeof(err.received) + " " : "") + format(err.received)
			}
			return err
		})
		model.errors = []
		errorCollector.call(model, errors) // throw all errors collected
	}
	return nbErrors
}

export let isModelInstance = i => i && is(Model, getProto(i).constructor)

export default Model