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

function getProxy(model, obj, defNode, path) {
	if(!isPlainObject(defNode)) {
		return cast(obj, defNode)
	}

	return new Proxy(obj || {}, {
		get(o, key) {
			const newPath = (path ? path + '.' + key : key),
			      defPart = defNode[key];
			if(o[key] && o.hasOwnProperty(key) && !isPlainObject(defPart) && !is(BasicModel, o[key].constructor)){
				o[key] = cast(o[key], defPart) // cast nested models
			}
			return getProxy(model, o[key], defPart, newPath)
		},
		set(o, key, val) {
			const newPath = (path ? path + '.' + key : key),
				  isConstant = model.conventionForConstant(key),
				  initialValue = o[key]
			
			if(isConstant && initialValue !== undefined){
				model.errorStack.push({
					message: `cannot redefine constant ${key}`
				})
			}
			if(defNode.hasOwnProperty(key)){
				const newProxy = getProxy(model, val, defNode[key], newPath)
				checkDefinition(newProxy, defNode[key], newPath, model.errorStack, [])
				o[key] = newProxy
				checkAssertions(obj, model, newPath)
			} else {
				model.errorStack.push({
					message: `cannot find property ${newPath} in the model definition`
				})
			}
		
			if(model.errorStack.length){
				o[key] = initialValue
				model.unstackErrors()
			}

			return true
		},
		has(o, key){
			return Reflect.has(o, key) && !model.conventionForPrivate(key)
		},
		ownKeys(o){
			return Reflect.ownKeys(o).filter(key => !model.conventionForPrivate(key))
		},
		getPrototypeOf(){
			return model.prototype
		}
	})
}

export default ObjectModel;