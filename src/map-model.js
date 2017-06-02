import { Model } from "./model"
import { checkDefinition, checkAssertions, extendDefinition } from "./definition"
import { extend, setConstructor, toString } from "./helpers"

const MAP_MUTATOR_METHODS = ["set", "delete", "clear"]

function MapModel(key, value) {

	const model = function(iterable) {
		const map = new Map(iterable)
		model.validate(map)
		return new Proxy(map, {
			getPrototypeOf: () => model.prototype,

			get(map, key) {
				if (MAP_MUTATOR_METHODS.includes(key)) return proxifyMethod(map, key, model)
				return map[key]
			}
		})
	}

	extend(model, Map)
	setConstructor(model, MapModel)
	model._init([ { key, value } ])
	return model
}

extend(MapModel, Model, {
	toString(stack){
		return "Map of " + toString(this.definition, stack)
	},

	_validate(map, path, errors, stack){
		if(map instanceof Map) {
			for(let [key, value] of map){
				let subPath = `${path || "Map"}[${toString(key)}]`
				checkDefinition(key, this.definition.key, subPath, errors, stack)
				checkDefinition(value, this.definition.value, subPath, errors, stack)
			}
		} else errors.push({
			expected: this,
			received: map,
			path
		})

		checkAssertions(map, this, errors)
	},

	extend(newKeys, newValues){
		return Model.prototype.extend.call(this, {
			key: extendDefinition(this.definition.key, newKeys),
			value: extendDefinition(this.definition.value, newValues)
		})
	}
})

function proxifyMethod(map, method, model){
	return function() {
		const testMap = new Map(map)
		Map.prototype[method].apply(testMap, arguments)
		model.validate(testMap)
		return Map.prototype[method].apply(map, arguments)
	}
}

export default MapModel