import {
	_validate, cast, checkAssertions, checkDefinition, extendDefinition, extendModel,
	format, formatDefinition, Model, stackError
} from "./object-model.js";
import { initListModel } from "./list-model.js"
import { extend, is, isIterable } from "./helpers.js"

export default function MapModel(key, value) {

	let castKeyValue = ([k, v]) => [cast(k, key), cast(v, value)]

	return initListModel(
		Map,
		MapModel,
		{ key, value },
		it => isIterable(it) ? new Map([...it].map(castKeyValue)) : it,
		map => new Map(map),
		{
			"set": castKeyValue,
			"delete": 0,
			"clear": 0
		}
	)
}

extend(MapModel, Model, {
	toString(stack) {
		let { key, value } = this.definition
		return `Map of ${formatDefinition(key, stack)} : ${formatDefinition(value, stack)}`
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
		let { key, value } = this.definition
		return extendModel(new MapModel(
			extendDefinition(key, keyParts),
			extendDefinition(value, valueParts)
		), this)
	}
})