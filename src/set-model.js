import { _validate, cast, checkAssertions, checkDefinition, extendDefinition, extendModel, formatDefinition, Model, stackError } from "./object-model.js"
import { initListModel } from "./list-model.js"
import { extend, is } from "./helpers.js"

export default function SetModel(def) {
	return initListModel(
		Set,
		SetModel,
		def,
		iterable => new Set([...iterable].map(val => cast(val, def))),
		set => new Set(set),
		{
			"add": ([val]) => [cast(val, def)],
			"delete": 0,
			"clear": 0
		}
	)
}

extend(SetModel, Model, {
	toString(stack) {
		return "Set of " + formatDefinition(this.definition, stack)
	},

	[_validate](set, path, errors, stack) {
		if (is(Set, set)) {
			for (let item of set.values()) {
				checkDefinition(item, this.definition, `${path || "Set"} value`, errors, stack)
			}
		} else stackError(errors, this, set, path)
		checkAssertions(set, this, path, errors)
	},

	extend(...newParts) {
		return extendModel(new SetModel(extendDefinition(this.definition, newParts)), this)
	}
})