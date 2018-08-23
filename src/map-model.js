import {
	_validate, cast, checkAssertions, checkDefinition, extendDefinition, extendModel,
	format, formatDefinition, Model, stackError
} from "./object-model.js"
import { initListModel } from "./list-model.js"
import { extend, is, isIterable } from "./helpers.js"

export default function MapModel(initialKeyDefinition, initialValueDefinition) {
	let getDef = i => i === 0 ? model.definition.key : model.definition.value,
		model = initListModel(
			Map,
			MapModel,
			{ key: initialKeyDefinition, value: initialValueDefinition },
			it => isIterable(it) ? new Map([...it].map(pair => pair.map((x,i) => cast(x, getDef(i))))) : it,
			map => new Map(map),
			{
				"set": [0, 1, getDef],
				"delete": [],
				"clear": []
			}
		)

	return model
}

extend(MapModel, Model, {
	toString(stack) {
		return `Map of ${formatDefinition(this.definition.key, stack)} : ${formatDefinition(this.definition.value, stack)}`
	},

	[_validate](map, path, errors, stack) {
		if (is(Map, map)) {
			path = path || 'Map'
			for (let [key, value] of map) {
				checkDefinition(key, this.definition.key, `${path} key`, errors, stack)
				checkDefinition(value, this.definition.value, `${path}[${format(key)}]`, errors, stack)
			}
		} else stackError(errors, this, map, path)

		checkAssertions(map, this, path, errors)
	},

	extend(keyParts, valueParts) {
		return extendModel(new MapModel(
			extendDefinition(this.definition.key, keyParts),
			extendDefinition(this.definition.value, valueParts)
		), this)
	}
})