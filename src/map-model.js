import {extendModel, initModel, Model, stackError} from "./model"
import {cast, checkAssertions, checkDefinition, extendDefinition} from "./definition"
import {extend, isFunction, setConstructor, toString} from "./helpers"

const MAP_MUTATORS = ["set", "delete", "clear"]

export default function MapModel(key, value) {

	const model = function (iterable = model.default) {
		const castKeyValue = pair => ["key", "value"].map((prop, i) => cast(pair[i], model.definition[prop]))
		const map          = new Map([...iterable].map(castKeyValue))

		if (!model.validate(map)) return

		return new Proxy(map, {
			getPrototypeOf: () => model.prototype,

			get(map, key) {
				let val = map[key];
				if (!isFunction(val)) return val

				return new Proxy(val, {
					apply: (fn, ctx, args) => {
						if (key === "set") {
							args = castKeyValue(args)
						}

						if (MAP_MUTATORS.includes(key)) {
							const testMap = new Map(map)
							fn.apply(testMap, args)
							model.validate(testMap)
						}

						return fn.apply(map, args)
					}
				})
			}
		})
	}

	extend(model, Map)
	setConstructor(model, MapModel)
	initModel(model, arguments.length > 0 ? [{key, value}] : [])
	return model
}

extend(MapModel, Model, {
	toString(stack){
		return "Map of " + toString(this.definition, stack)
	},

	_validate(map, path, errors, stack){
		if (map instanceof Map) {
			for (let [key, value] of map) {
				let subPath = `${path || "Map"}[${toString(key)}]`
				checkDefinition(key, this.definition.key, subPath, errors, stack),
				checkDefinition(value, this.definition.value, subPath, errors, stack)
			}
		} else stackError(errors, this, map, path)

		checkAssertions(map, this, errors)
	},

	extend(newKeys, newValues){
		const {key, value} = this.definition
		return extendModel(new MapModel(extendDefinition(key, newKeys), extendDefinition(value, newValues)), this)
	}
})