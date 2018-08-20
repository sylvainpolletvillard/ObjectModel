import { _original, MODE_CAST, initModel } from "./object-model.js"
import { extend, has, isFunction, proxifyFn, proxifyModel, setConstructor } from "./helpers.js"

export const initListModel = (base, constructor, def, init, clone, mutators, otherTraps = {}) => {

	let model = function (list = model.default, mode) {
		list = init(list)

		if (mode === MODE_CAST || model.validate(list)) {
			return proxifyModel(list, model, Object.assign({
				get(l, key) {
					if (key === _original) return l

					let val = l[key];
					return isFunction(val) ? proxifyFn(val, (fn, ctx, args) => {
						if (has(mutators, key)) {
							if (mutators[key]) args = mutators[key](args) // autocast method args

							let testingClone = clone(l)
							fn.apply(testingClone, args)
							model.validate(testingClone)
						}

						return fn.apply(l, args)
					}) : val
				}
			}, otherTraps))
		}
	}

	extend(model, base)
	setConstructor(model, constructor)
	initModel(model, def)
	return model
}