import {extendModel, initModel, isModelInstance, Model, stackError, unstackErrors} from "./model"
import {cast, checkAssertions, checkDefinition} from "./definition"
import {format} from "./formatter"
import {
	_constructor,
	_validate,
	cannot,
	extend,
	getPath,
	getProto,
	has,
	is,
	isFunction,
	isObject,
	isPlainObject,
	isString,
	mapProps,
	merge,
	ObjectProto,
	proxify,
	setConstructor
} from "./helpers"

export default function ObjectModel(def, params) {
	let model = function (obj = model.default) {
		let instance = this
		if (!is(model, instance)) return new model(obj)
		if (is(model, obj)) return obj

		merge(instance, model[_constructor](obj), true)
		if (!model.validate(instance)) return
		return getProxy(model, instance, model.definition)
	}

	Object.assign(model, params)
	extend(model, Object)
	setConstructor(model, ObjectModel)
	initModel(model, def)
	return model
}

extend(ObjectModel, Model, {
	sealed: false,

	defaults(p){
		Object.assign(this.prototype, p)
		return this
	},

	toString(stack){
		return format(this.definition, stack)
	},

	extend(...newParts){
		let parent = this,
		    def = Object.assign({}, this.definition),
		    newAssertions = [],
		    proto = {}

		merge(proto, parent.prototype, false)

		for (let part of newParts) {
			if (is(Model, part)) {
				merge(def, part.definition, true)
				newAssertions.push(...part.assertions)
			}
			if (isFunction(part)) merge(proto, part.prototype, true)
			if (isObject(part)) merge(def, part, true)
		}

		let submodel = extendModel(new ObjectModel(def), parent, proto)
		submodel.assertions = parent.assertions.concat(newAssertions)

		if(getProto(parent) !== ObjectModel.prototype) { // extended class
			submodel[_constructor] = (obj) => {
				let parentInstance = new parent(obj)
				merge(obj, parentInstance, true) // get modified props from parent class constructor
				return obj
			}
		}

		return submodel
	},

	[_validate](obj, path, errors, stack){
		if (isObject(obj)){
			let def = this.definition
			checkDefinition(obj, def, path, errors, stack)
			if(this.sealed) checkUndeclaredProps(obj, def, errors)
		}
		else stackError(errors, this, obj, path)

		checkAssertions(obj, this, path, errors)
	}
})

let getProxy = (model, obj, def, path) => !isPlainObject(def) ? cast(obj, def) : proxify(obj, {

	getPrototypeOf: () => path ? ObjectProto : getProto(obj),

	get(o, key) {
		if (!isString(key))
			return Reflect.get(o, key)

		let newPath = getPath(path, key),
		    defPart = def[key];

		if (key in def && model.conventionForPrivate(key)) {
			cannot(`access to private property ${newPath}`, model)
			unstackErrors(model)
			return
		}

		if (o[key] && has(o, key) && !isPlainObject(defPart) && !isModelInstance(o[key])) {
			o[key] = cast(o[key], defPart) // cast nested models
		}

		if (isFunction(o[key]) && o[key].bind)
			return o[key].bind(o); // auto-bind methods to original object, so they can access private props

		if(isPlainObject(defPart) && !o[key]){
			o[key] = {} // null-safe traversal
		}

		return getProxy(model, o[key], defPart, newPath)
	},

	set(o, key, val) {
		return controlMutation(model, def, path, o, key, (newPath) => Reflect.set(o, key, getProxy(model, val, def[key], newPath)))
	},

	deleteProperty(o, key) {
		return controlMutation(model, def, path, o, key, () => Reflect.deleteProperty(o, key))
	},

	defineProperty(o, key, args){
		return controlMutation(model, def, path, o, key, () => Reflect.defineProperty(o, key, args))
	},

	has(o, key){
		return Reflect.has(o, key) && Reflect.has(def, key) && !model.conventionForPrivate(key)
	},

	ownKeys(o){
		return Reflect.ownKeys(o).filter(key => Reflect.has(def, key) && !model.conventionForPrivate(key))
	},

	getOwnPropertyDescriptor(o, key){
		let descriptor;
		if (!model.conventionForPrivate(key)) {
			descriptor = Object.getOwnPropertyDescriptor(def, key);
			if (descriptor !== undefined) descriptor.value = o[key];
		}

		return descriptor
	}
})

let controlMutation = (model, def, path, o, key, applyMutation) => {
	let newPath       = getPath(path, key),
	    isPrivate     = model.conventionForPrivate(key),
	    isConstant    = model.conventionForConstant(key),
	    isOwnProperty = has(o, key),
	    initialPropDescriptor = isOwnProperty && Object.getOwnPropertyDescriptor(o, key)

	if (key in def && (isPrivate || (isConstant && o[key] !== undefined)))
		cannot(`modify ${isPrivate ? "private" : "constant"} ${key}`, model)

	let isInDefinition = has(def, key);
	if (isInDefinition || !model.sealed) {
		applyMutation(newPath)
		isInDefinition && checkDefinition(o[key], def[key], newPath, model.errors, [])
		checkAssertions(o, model, newPath)
	}
	else rejectUndeclaredProp(newPath, o[key], model.errors)

	let nbErrors = model.errors.length
	if (nbErrors) {
		if (isOwnProperty) Object.defineProperty(o, key, initialPropDescriptor)
		else delete o[key] // back to the initial property defined in prototype chain

		unstackErrors(model)
	}

	return !nbErrors
}

let checkUndeclaredProps = (obj, def, errors, path) => {
	mapProps(obj, key => {
		let val = obj[key],
		    subpath = getPath(path, key)
		if(!has(def, key)) rejectUndeclaredProp(subpath, val, errors)
		else if(isPlainObject(val))	checkUndeclaredProps(val, def[key], errors, subpath)
	})
}

let rejectUndeclaredProp = (path, received, errors) => {
	errors.push({
		path,
		received,
		message: `property ${path} is not declared in the sealed model definition`
	})
}