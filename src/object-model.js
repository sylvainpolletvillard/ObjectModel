import { BasicModel, initModel } from "./basic-model"
import { cast, checkDefinition, checkAssertions } from "./definition"
import { is, isFunction, isObject, isPlainObject, merge, setConstructorProto, toString } from "./helpers"

function ObjectModel(def){
	const model = function(obj = model.default) {
		if(!is(model, this)) return new model(obj)
		if(is(model, obj)) return obj
		merge(this, obj, true)
		const proxy = getProxy(model, this, model.definition)
		model.validate(proxy)
		return proxy
	}

	setConstructorProto(model, Object.prototype)
	initModel(model, arguments, ObjectModel)
	return model
}

setConstructorProto(ObjectModel, BasicModel.prototype)

Object.assign(ObjectModel.prototype, {

	defaults(p){
		Object.assign(this.prototype, p)
		return this
	},

	toString(stack){
		return toString(this.definition, stack)
	},

	extend(){
		const def = {}
		const proto = {}
		const args = [...arguments]

		Object.assign(def, this.definition)
		merge(proto, this.prototype, false, true)
		args.forEach(arg => {
			if(is(BasicModel, arg)) merge(def, arg.definition, true)
			if(isFunction(arg)) merge(proto, arg.prototype, true, true)
			if(isObject(arg)) merge(def, arg, true, true)
		})
		delete proto.constructor;

		let assertions = [...this.assertions]
		args.forEach(arg => {
			if(is(BasicModel, arg)) assertions = assertions.concat(arg.assertions)
		})

		const submodel = new this.constructor(def)
		setConstructorProto(submodel, this.prototype)
		Object.assign(submodel.prototype, proto)
		submodel.assertions = assertions
		submodel.errorCollector = this.errorCollector
		return submodel
	},

	_validate(obj, path, errorStack, callStack){
		if(!isObject(obj)){
			errorStack.push({
				expected: this,
				received: obj,
				path
			})
		} else {
			checkDefinition(obj, this.definition, path, errorStack, callStack)
		}
		checkAssertions(obj, this, path, errorStack)
	}
})

function getProxy(model, obj, def, path) {
	if(!isPlainObject(def)) {
		return cast(obj, def)
	}

	return new Proxy(obj || {}, {
		get(o, key) {
			const newPath = (path ? path + '.' + key : key),
			      defPart = def[key];
			if(o[key] && o.hasOwnProperty(key) && !isPlainObject(defPart) && !is(BasicModel, o[key].constructor)){
				o[key] = cast(o[key], defPart) // cast nested models
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

		ownKeys(o){
			return Reflect.ownKeys(o).filter(key => Reflect.has(def, key) && !model.conventionForPrivate(key))
		},

		getPrototypeOf(){
			return model.prototype
		}
	})
}

function controlMutation(model, def, path, o, key, applyMutation){
	const newPath = (path ? path + '.' + key : key),
	      isPrivate = model.conventionForPrivate(key),
	      isConstant = model.conventionForConstant(key),
	      isOwnProperty = o.hasOwnProperty(key),
	      initialPropDescriptor = isOwnProperty && Object.getOwnPropertyDescriptor(o, key)

	if(isPrivate || (isConstant && o[key] !== undefined)){
		model.errorStack.push({
			message: `cannot modify ${isPrivate ? "private" : "constant"} ${key}`
		})
	}

	if(def.hasOwnProperty(key)){
		applyMutation(newPath)
		checkDefinition(o[key], def[key], newPath, model.errorStack, [])
		checkAssertions(o, model, newPath)
	} else {
		model.errorStack.push({
			message: `cannot find property ${newPath} in the model definition`
		})
	}

	if(model.errorStack.length){
		if(isOwnProperty) Object.defineProperty(o, key, initialPropDescriptor)
		else delete o[key] // back to the initial property defined in prototype chain

		model.unstackErrors()
		return false
	}

	return true
}

export default ObjectModel;