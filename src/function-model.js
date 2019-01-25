import {
	_check, _original, _validate, checkAssertions, checkDefinition, extendDefinition, extendModel,
	format, formatDefinition, initModel, Model, stackError, unstackErrors
} from "./object-model.js"
import { extend, isFunction, proxifyModel } from "./helpers.js"


export default function FunctionModel(...argsDef) {

	let model = function (fn = model.default) {
		if (model[_validate](fn)) {
			return proxifyModel(fn, model, {
				get(fn, key) {
					return key === _original ? fn : fn[key]
				},

				apply(fn, ctx, args) {
					let def = model.definition

					def.arguments.forEach((argDef, i) => {
						args[i] = checkDefinition(args[i], argDef, `arguments[${i}]`, model.errors, [], true)
					})

					checkAssertions(args, model, "arguments")

					let result
					if (!model.errors.length) {
						result = Reflect.apply(fn, ctx, args)
						if ("return" in def)
							result = checkDefinition(result, def.return, "return value", model.errors, [], true)
					}
					unstackErrors(model)
					return result
				}
			})
		}
	}

	extend(model, Function)
	return initModel(model, FunctionModel, { arguments: argsDef })
}

extend(FunctionModel, Model, {
	toString(stack = []) {
		let out = `Function(${this.definition.arguments.map(
			argDef => formatDefinition(argDef, [...stack])
		).join(", ")})`

		if ("return" in this.definition) {
			out += " => " + formatDefinition(this.definition.return, stack)
		}
		return out
	},

	return(def) {
		this.definition.return = def
		return this
	},

	extend(newArgs, newReturns) {
		let args = this.definition.arguments,
			mixedArgs = newArgs.map((a, i) => extendDefinition(i in args ? args[i] : [], newArgs[i])),
			mixedReturns = extendDefinition(this.definition.return, newReturns)
		return extendModel(new FunctionModel(...mixedArgs).return(mixedReturns), this)
	},

	[_check](f, path, errors) {
		if (!isFunction(f)) stackError(errors, "Function", f, path)
	}
})

FunctionModel.prototype.assert(function numberOfArgs(args) {
	return (args.length > this.definition.arguments.length) ? args : true
}, function (args) {
	return `expecting ${this.definition.arguments.length} arguments for ${format(this)}, got ${args.length}`
})