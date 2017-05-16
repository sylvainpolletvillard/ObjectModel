import { BasicModel, initModel } from "./basic-model"
import {checkDefinition, checkAssertions} from "./definition"
import { isFunction, setConstructorProto, toString } from "./helpers"

function FunctionModel(){

	const model = function(fn = model.default) {
		return new Proxy(fn, {
			getPrototypeOf: () => model.prototype,

			apply (fn, ctx, args) {
				const def = model.definition
				args = Object.assign([], def.defaults, args)

				def.arguments.forEach((argDef, i) => {
					args[i] = checkDefinition(args[i], argDef, `arguments[${i}]`, model.errorStack, [], true)
				})

				checkAssertions(args, model, "arguments")

				let result
				if(!model.errorStack.length){
					result = Reflect.apply(fn, ctx, args)
					if ("return" in def)
						result = checkDefinition(result, def.return, "return value", model.errorStack, [], true)
				}
				model.unstackErrors()
				return result
			}
		});
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

FunctionModel.prototype.assert(function(args){
	if (args.length > this.definition.arguments.length) return args
	return true
}, function(args){
	return `expecting ${this.definition.arguments.length} arguments for ${toString(this)}, got ${args.length}`
})

export default FunctionModel