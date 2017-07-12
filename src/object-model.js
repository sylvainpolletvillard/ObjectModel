import {extendModel, initModel, Model, stackError, unstackErrors} from "./model"
import {cast, checkAssertions, checkDefinition} from "./definition"
import {
	_constructor,
	_validate,
	cannot,
	extend,
	format,
	getProto,
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

export default function ObjectModel(def) {
	const model = function (obj = model.default) {
		let instance = this
		if (!is(model, instance)) return new model(obj)
		if (is(model, obj)) return obj

		merge(instance, model[_constructor](obj), true)
		if (!model.validate(instance)) return
		return getProxy(model, instance, model.definition)
	}

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
		const parent = this
		const def = Object.assign({}, this.definition)
		const newAssertions = []

		const proto = {}
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
			submodel[_constructor] = function(obj){
				let parentInstance = new parent(obj)
				merge(obj, parentInstance, true) // get modified props from parent class constructor
				return obj
			}
		}

		return submodel
	},

	[_validate](obj, path, errors, stack){
		if (isObject(obj)){
			checkDefinition(obj, this.definition, path, errors, stack)
			if(this.sealed){
				//TODO: méthode générique de deep traverse des nested props
				Object.keys(obj).filter(key => !this.definition.hasOwnProperty(key)).forEach(key => {
					const newPath = (path ? path + '.' + key : key);
					rejectUndeclaredProp(newPath, obj[key], errors)
				})
			}
		}
		else stackError(errors, this, obj, path)

		checkAssertions(obj, this, path, errors)
	}
})

function getProxy(model, obj, def, path) {
	if (!isPlainObject(def))
		return cast(obj, def)

	return proxify(obj || {}, {
		getPrototypeOf: () => path ? Object.prototype : getProto(obj),

		get(o, key) {
			if (!isString(key))
				return Reflect.get(o, key)

			const newPath = (path ? path + '.' + key : key),
			      defPart = def[key];

			if (key in def && model.conventionForPrivate(key)) {
				cannot(`access to private property ${newPath}`, model)
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
		cannot(`modify ${isPrivate ? "private" : "constant"} ${key}`, model)

	const isInDefinition = def.hasOwnProperty(key);
	if (isInDefinition || !model.sealed) {
		applyMutation(newPath)
		isInDefinition && checkDefinition(o[key], def[key], newPath, model.errors, [])
		checkAssertions(o, model, newPath)
	}
	else rejectUndeclaredProp(newPath, o[key], model.errors)

	if (model.errors.length) {
		if (isOwnProperty) Object.defineProperty(o, key, initialPropDescriptor)
		else delete o[key] // back to the initial property defined in prototype chain

		unstackErrors(model)
		return false
	}

	return true
}

const rejectUndeclaredProp = (path, received, errors) => {
	errors.push({
		path,
		received,
		message: `property ${path} is not declared in the sealed model definition`
	})
}