import {extendModel, initModel, Model, stackError} from "./model.js"
import {cast, checkAssertions, checkDefinition, extendDefinition, formatDefinition} from "./definition.js"
import {_validate, extend, isFunction, proxifyFn, proxifyModel, setConstructor} from "./helpers.js"
import {format} from "./formatter.js"

let MAP_MUTATORS = ["set", "delete", "clear"]

export default function MapModel(key, value) {

	let model = function (iterable = model.default) {
		let castKeyValue = pair => ["key", "value"].map((prop, i) => cast(pair[i], model.definition[prop])),
		    map = new Map([...iterable].map(castKeyValue))

		if (!model.validate(map)) return

		return proxifyModel(map, model, {
			get(map, key) {
				let val = map[key];
				return isFunction(val) ? proxifyFn(val, (fn, ctx, args) => {
					if (key === "set") {
						args = castKeyValue(args)
					}

					if (MAP_MUTATORS.includes(key)) {
						let testMap = new Map(map)
						fn.apply(testMap, args)
						model.validate(testMap)
					}

					return fn.apply(map, args)
				}) : val
			}
		})
	}

	extend(model, Map)
	setConstructor(model, MapModel)
	initModel(model, {key, value})
	return model
}

extend(MapModel, Model, {
	toString(stack) {
		let {key, value} = this.definition
		return `Map of ${formatDefinition(key, stack)} : ${formatDefinition(value, stack)}`
	},

	[_validate](map, path, errors, stack) {
		if (map instanceof Map) {
			path = path || 'Map'
			for (let [key, value] of map) {
				checkDefinition(key, this.definition.key, `${path} key`, errors, stack)
				checkDefinition(value, this.definition.value, `${path}[${format(key)}]`, errors, stack)
			}
		} else stackError(errors, this, map, path)

		checkAssertions(map, this, path, errors)
	},

	extend(keyPart, valuePart){
		let {key, value} = this.definition
		return extendModel(new MapModel(extendDefinition(key, keyPart), extendDefinition(value, valuePart)), this)
	}
})