import {extendModel, initModel, Model, stackError} from "./model"
import {cast, checkAssertions, checkDefinition, extendDefinition} from "./definition"
import {extend, isFunction, setConstructor, toString} from "./helpers"

const SET_MUTATORS = ["add", "delete", "clear"]

export default function SetModel(def) {

	const model = function (iterable = model.default) {
		const castValue = val => cast(val, model.definition)
		const set       = new Set([...iterable].map(castValue))

		if (!model.validate(set)) return

		return new Proxy(set, {
			getPrototypeOf: () => model.prototype,

			get(set, key) {
				let val = set[key]
				if (!isFunction(val)) return val;

				return new Proxy(val, {
					apply: (fn, ctx, args) => {
						if (key === "add") {
							args[0] = castValue(args[0])
						}

						if (SET_MUTATORS.includes(key)) {
							const testSet = new Set(set)
							fn.apply(testSet, args)
							model.validate(testSet)
						}

						return fn.apply(set, args)
					}
				})
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
		return "Set of " + toString(this.definition, stack)
	},

	_validate(set, path, errors, stack){
		if (set instanceof Set) {
			for (let item of set.values()) {
				checkDefinition(item, this.definition, (path || "Set"), errors, stack)
			}
		} else stackError(errors, this, set, path)
		checkAssertions(set, this, errors)
	},

	extend(...newParts){
		return extendModel(new SetModel(extendDefinition(this.definition, newParts)), this)
	}
})