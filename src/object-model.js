import {extendModel, initModel, Model, stackError, unstackErrors} from "./model"
import {cast, checkAssertions, checkDefinition} from "./definition"
import {
	extend,
	format,
	is,
	isFunction,
	isModelInstance,
	isObject,
	isPlainObject,
	isString,
	merge,
	proxify,
	setConstructor
} from "./helpers"

const cannot = (model, msg) => {
	model.errors.push({message: "cannot " + msg})
}

export default function ObjectModel(def) {
	const model = function (obj = model.default) {
		if (!is(model, this)) return new model(obj)
		if (is(model, obj)) return obj
		merge(this, obj, true)
		if (!model.validate(this)) return
		return getProxy(model, this, model.definition)
	}

	extend(model, Object)
	setConstructor(model, ObjectModel)
	initModel(model, def)
	return model
}

extend(ObjectModel, Model, {
	sealed: true,

	defaults(p){
		Object.assign(this.prototype, p)
		return this
	},

	toString(stack){
		return format(this.definition, stack)
	},

	extend(...newParts){
		const def = Object.assign({}, this.definition)
		const newAssertions = []

		const proto = {}
		if(newParts.some(isFunction)){
			merge(proto, this.prototype, false, true) // composition instead of inheritance
		}

		for (let part of newParts) {
			if (is(Model, part)) {
				merge(def, part.definition, true)
				newAssertions.push(...part.assertions)
			}
			if (isFunction(part)) merge(proto, part.prototype, true, true)
			if (isObject(part)) merge(def, part, true, true)
		}

		const submodel = extendModel(new ObjectModel(def), this, proto)
		submodel.assertions.push(...newAssertions)
		return submodel
	},

	_validate(obj, path, errors, stack){
		if (isObject(obj)) checkDefinition(obj, this.definition, path, errors, stack)
		else stackError(errors, this, obj, path)

		checkAssertions(obj, this, path, errors)
	}
})

function getProxy(model, obj, def, path) {
	if (!isPlainObject(def))
		return cast(obj, def)

	return proxify(obj || {}, {
		getPrototypeOf: () => path ? Object.prototype : model.prototype,

		get(o, key) {
			if (!isString(key))
				return Reflect.get(o, key)

			const newPath = (path ? path + '.' + key : key),
			      defPart = def[key];

			if (key in def && model.conventionForPrivate(key)) {
				cannot(model, `access to private property ${newPath}`)
				unstackErrors(model)
				return
			}

			if (o[key] && o.hasOwnProperty(key) && !isPlainObject(defPart) && !isModelInstance(o[key])) {
				o[key] = cast(o[key], defPart) // cast nested models
			}

			if (isFunction(o[key]) && o[key].bind) {
				return o[key].bind(o); // auto-bind methods to original object, so they can access private props
			}

			return getProxy(model, o[key], defPart, newPath)
		},

		set(o, key, val) {
			return controlMutation(model, def, path, o, key, (newPath) => {
				Reflect.set(o, key, getProxy(model, val, def[key], newPath))
			})
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

		ownKeys(){
			return Reflect.ownKeys(def).filter(key => !model.conventionForPrivate(key))
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
}

function controlMutation(model, def, path, o, key, applyMutation) {
	const newPath       = (path ? path + '.' + key : key),
	      isPrivate     = model.conventionForPrivate(key),
	      isConstant    = model.conventionForConstant(key),
	      isOwnProperty = o.hasOwnProperty(key)

	const initialPropDescriptor = isOwnProperty && Object.getOwnPropertyDescriptor(o, key)

	if (key in def && (isPrivate || (isConstant && o[key] !== undefined)))
		cannot(model, `modify ${isPrivate ? "private" : "constant"} ${key}`)

	const isInDefinition = def.hasOwnProperty(key);
	if (isInDefinition || !model.sealed) {
		applyMutation(newPath)
		isInDefinition && checkDefinition(o[key], def[key], newPath, model.errors, [])
		checkAssertions(o, model, newPath)
	}
	else cannot(model, `find property ${newPath} in the model definition`)

	if (model.errors.length) {
		if (isOwnProperty) Object.defineProperty(o, key, initialPropDescriptor)
		else delete o[key] // back to the initial property defined in prototype chain

		unstackErrors(model)
		return false
	}

	return true
}