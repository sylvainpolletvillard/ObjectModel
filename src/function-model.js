import {
	_check, _original, Any, checkAssertions, checkDefinition, extendDefinition, extendModel,
	formatDefinition, initModel, Model, stackError, unstackErrors
} from "./object-model.js"
import { extend, is, isFunction } from "./helpers.js"

export default function FunctionModel(...argsDef) {
	return initModel({ arguments: argsDef }, FunctionModel, Function, null, model => ({
		getPrototypeOf: () => model.prototype,

		get(fn, key) {
			return key === _original ? fn : fn[key]
		},

		apply(fn, ctx, args) {
			const def = model.definition
			const remainingArgDef = def.arguments.find(argDef => is(Any.remaining, argDef))
			const nbArgsToCheck = remainingArgDef ? Math.max(args.length, def.arguments.length - 1) : def.arguments.length

			for (let i = 0; i < nbArgsToCheck; i++) {
				const argDef = remainingArgDef && i >= def.arguments.length - 1 ? remainingArgDef.definition : def.arguments[i]
				args[i] = checkDefinition(args[i], argDef, `arguments[${i}]`, model.errors, [], true)
			}

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
	}))
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
		const args = this.definition.arguments,
			  mixedArgs = newArgs.map((a, i) => extendDefinition(i in args ? args[i] : [], newArgs[i])),
			  mixedReturns = extendDefinition(this.definition.return, newReturns)
		return extendModel(new FunctionModel(...mixedArgs).return(mixedReturns), this)
	},

	[_check](f, path, errors) {
		if (!isFunction(f)) stackError(errors, "Function", f, path)
	}
})