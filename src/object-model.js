import { Model } from "./model"
import { cast, checkDefinition, checkAssertions } from "./definition"
import { extend, is, isString, isFunction, isObject, isPlainObject, merge, setConstructor, toString } from "./helpers"


export default function ObjectModel(){
	const model = function(obj = model.default) {
		if(!is(model, this)) return new model(obj)
		if(is(model, obj)) return obj
		merge(this, obj, true)
		if(model.hasOwnProperty("constructor")){
			model.constructor.call(this, obj)
		}
		model.validate(this)
		return getProxy(model, this, model.definition)
	}

	extend(model, Object)
	setConstructor(model, ObjectModel)
	model._init(arguments)
	return model
}

extend(ObjectModel, Model, {
	defaults(p){
		Object.assign(this.prototype, p)
		return this
	},

	toString(stack){
		return toString(this.definition, stack)
	},

	extend(...args){
		const def = {}
		const proto = {}

		Object.assign(def, this.definition)
		merge(proto, this.prototype, false, true)
		args.forEach(arg => {
			if(is(Model, arg)) merge(def, arg.definition, true)
			if(isFunction(arg)) merge(proto, arg.prototype, true, true)
			if(isObject(arg)) merge(def, arg, true, true)
		})
		delete proto.constructor;

		const submodel = Model.prototype.extend.call(this, def, proto)
		args.forEach(arg => {
			if(is(Model, arg)) submodel.assertions.push(...arg.assertions)
		})

		return submodel
	},

	_validate(obj, path, errors, stack){
		if(!isObject(obj)){
			errors.push({
				expected: this,
				received: obj,
				path
			})
		} else {
			checkDefinition(obj, this.definition, path, errors, stack)
		}
		checkAssertions(obj, this, path, errors)
	}
})

function getProxy(model, obj, def, path) {
	if(!isPlainObject(def)) {
		return cast(obj, def)
	}

	return new Proxy(obj || {}, {
		getPrototypeOf(){
			return path ? Object.prototype : model.prototype
		},

		get(o, key) {
			if(!isString(key)) return Reflect.get(o, key)

			const newPath = (path ? path + '.' + key : key),
			      defPart = def[key];

			if(key in def && model.conventionForPrivate(key)){
				model.errors.push({
					message: `cannot access to private property ${newPath}`
				})
				model.unstackErrors()
				return
			}

			if(o[key] && o.hasOwnProperty(key) && !isPlainObject(defPart) && !is(Model, o[key].constructor)){
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
			if(!model.conventionForPrivate(key)){
				descriptor = Object.getOwnPropertyDescriptor(def, key);
				if(descriptor !== undefined) descriptor.value = o[key];
			}

			return descriptor
		}
	})
}

function controlMutation(model, def, path, o, key, applyMutation){
	const newPath = (path ? path + '.' + key : key),
	      isPrivate = model.conventionForPrivate(key),
	      isConstant = model.conventionForConstant(key),
	      isOwnProperty = o.hasOwnProperty(key),
	      initialPropDescriptor = isOwnProperty && Object.getOwnPropertyDescriptor(o, key)

	if(key in def && (isPrivate || (isConstant && o[key] !== undefined))){
		model.errors.push({
			message: `cannot modify ${isPrivate ? "private" : "constant"} ${key}`
		})
	}

	if(def.hasOwnProperty(key)){
		applyMutation(newPath)
		checkDefinition(o[key], def[key], newPath, model.errors, [])
		checkAssertions(o, model, newPath)
	} else {
		model.errors.push({
			message: `cannot find property ${newPath} in the model definition`
		})
	}

	if(model.errors.length){
		if(isOwnProperty) Object.defineProperty(o, key, initialPropDescriptor)
		else delete o[key] // back to the initial property defined in prototype chain

		model.unstackErrors()
		return false
	}

	return true
}