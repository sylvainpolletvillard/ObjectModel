import {extendModel, initModel, Model, stackError, unstackErrors} from "./model"
import {checkAssertions, checkDefinition, extendDefinition, formatDefinition} from "./definition"
import {_validate, extend, format, isFunction, proxifyModel, setConstructor} from "./helpers"


export default function FunctionModel(...argsDef) {

	const model = function (fn = model.default) {
		if (!model.validate(fn)) return
		return proxifyModel(fn, model, {
			apply (fn, ctx, args) {
				const def = model.definition

				def.arguments.forEach((argDef, i) => {
					args[i] = checkDefinition(args[i], argDef, `arguments[${i}]`, model.errors, [])
				})

				checkAssertions(args, model, "arguments")

				let result
				if (!model.errors.length) {
					result = Reflect.apply(fn, ctx, args)
					if ("return" in def)
						result = checkDefinition(result, def.return, "return value", model.errors, [])
				}
				unstackErrors(model)
				return result
			}
		});
	}

	extend(model, Function)
	setConstructor(model, FunctionModel)
	initModel(model, {arguments: argsDef})

	return model
}

extend(FunctionModel, Model, {
	toString(stack = []){
		let out = `Function(${this.definition.arguments.map(
			argDef => formatDefinition(argDef, stack.slice())
		).join(",")})`

		if ("return" in this.definition) {
			out += " => " + formatDefinition(this.definition.return, stack)
		}
		return out
	},

	return(def){
		this.definition.return = def
		return this
	},

	extend(newArgs, newReturns) {
		const args = this.definition.arguments
		const mixedArgs = newArgs.map((a, i) => extendDefinition(i in args ? args[i] : [], newArgs[i]))
		const mixedReturns = extendDefinition(this.definition.return, newReturns)
		return extendModel(new FunctionModel(...mixedArgs).return(mixedReturns), this)
	},

	[_validate](f, path, errors){
		if (!isFunction(f)) {
			stackError(errors, "Function", f, path)
		}
	}
})

FunctionModel.prototype.assert(function (args) {
	if (args.length > this.definition.arguments.length) return args
	return true
}, function (args) {
	return `expecting ${this.definition.arguments.length} arguments for ${format(this)}, got ${args.length}`
})