import {extendModel, initModel, Model, stackError} from "./model"
import {cast, checkAssertions, checkDefinition, extendDefinition, formatDefinition} from "./definition"
import {_validate, extend, isFunction, proxifyFn, proxifyModel, setConstructor} from "./helpers"

let SET_MUTATORS = ["add", "delete", "clear"]

export default function SetModel(def) {

	let model = function (iterable = model.default) {
		let castValue = val => cast(val, model.definition),
		    set = new Set([...iterable].map(castValue))

		if (!model.validate(set)) return

		return proxifyModel(set, model, {
			get(set, key) {
				let val = set[key]
				return isFunction(val) ? proxifyFn(val, (fn, ctx, args) => {
					if (key === "add") {
						args[0] = castValue(args[0])
					}

					if (SET_MUTATORS.includes(key)) {
						let testSet = new Set(set)
						fn.apply(testSet, args)
						model.validate(testSet)
					}

					return fn.apply(set, args)
				}) : val
			}
		})
	}

	extend(model, Set)
	setConstructor(model, SetModel)
	initModel(model, def)
	return model
}

extend(SetModel, Model, {
	toString(stack){
		return "Set of " + formatDefinition(this.definition, stack)
	},

	[_validate](set, path, errors, stack){
		if (set instanceof Set) {
			for (let item of set.values()) {
				checkDefinition(item, this.definition, `${path || "Set"} value`, errors, stack)
			}
		} else stackError(errors, this, set, path)
		checkAssertions(set, this, path, errors)
	},

	extend(...newParts){
		return extendModel(new SetModel(extendDefinition(this.definition, newParts)), this)
	}
})