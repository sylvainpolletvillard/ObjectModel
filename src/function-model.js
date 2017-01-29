import { BasicModel, initModel, checkDefinition, checkAssertions } from "./basic-model"
import { isFunction, setConstructor, setConstructorProto, toString } from "./helpers"

function FunctionModel(){

	const model = function(fn = model.default) {
		const def = model.definition
		const proxyFn = function () {
			const args = []
			Object.assign(args, def.defaults)
			Object.assign(args, [...arguments])
			if (args.length > def.arguments.length) {
				model.errorStack.push({
					expected: toString(fn) + " to be called with " + def.arguments.length + " arguments",
					received: args.length
				})
			}
			def.arguments.forEach((argDef, i) => {
				args[i] = checkDefinition(args[i], argDef, `arguments[${i}]`, model.errorStack, [], true)
			})
			checkAssertions(args, model, "arguments")

			let returnValue
			if(!model.errorStack.length){
				returnValue = fn.apply(this, args)
				if ("return" in def)
					returnValue = checkDefinition(returnValue, def.return, "return value", model.errorStack, [], true)
			}
			model.unstackErrors()
			return returnValue
		}
		setConstructor(proxyFn, model)
		return proxyFn
	}

	setConstructorProto(model, Function.prototype)

	const def = { arguments: [...arguments] }
	initModel(model, [ def ], FunctionModel)
	return model
}

setConstructorProto(FunctionModel, BasicModel.prototype)

Object.assign(FunctionModel.prototype, {

	toString(stack){
		let out = 'Function(' + this.definition.arguments.map(argDef => toString(argDef, stack)).join(",") +')'
		if("return" in this.definition) {
			out += " => " + toString(this.definition.return)
		}
		return out
	},

	return(def){
		this.definition.return = def
		return this
	},

	defaults(){
		this.definition.defaults = [...arguments]
		return this
	},

	_validate(f, path, errorStack){
		if (!isFunction(f)) {
			errorStack.push({
				expected: "Function",
				received: f,
				path
			})
		}
	}
})

export default FunctionModel