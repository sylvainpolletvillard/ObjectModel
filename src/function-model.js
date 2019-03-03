import {
	_check, _original, Any, checkAssertions, checkDefinition, extendDefinition, extendModel,
	format, formatDefinition, initModel, Model, stackError, unstackErrors
} from "./object-model.js"
import { extend, is, isFunction } from "./helpers.js"

export default function FunctionModel(...argsDef) {
	return initModel({ arguments: argsDef }, FunctionModel, Function, null, model => ({
		getPrototypeOf: () => model.prototype,

		get(fn, key) {
			return key === _original ? fn : fn[key]
		},

		apply(fn, ctx, args) {
			let def = model.definition,
				nbArgsDef = def.arguments.length,
				remainingArgDefIndex = def.arguments.findIndex(argDef => is(Any.remaining, argDef)),
				remainingArgDef = def.arguments[remainingArgDefIndex],
				nbArgsToCheck = remainingArgDef ? Math.max(args.length, remainingArgDefIndex) : nbArgsDef

			for (let i = 0; i < nbArgsToCheck; i++) {
				let argDef = remainingArgDef && i >= remainingArgDefIndex ? remainingArgDef.definition : def.arguments[i]
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
	let argsDef = this.definition.arguments;
	return (args.length > argsDef.length && !argsDef.some(argDef => is(Any.remaining, argDef))) ? args : true
}, function (args) {
	return `expecting ${this.definition.arguments.length} arguments for ${format(this)}, got ${args.length}`
})