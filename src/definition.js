import {is, isArray, isFunction, isPlainObject, mapProps} from "./helpers.js"
import {format, formatPath} from "./formatter.js"
import {isModelInstance, Model, stackError} from "./model.js"
import ObjectModel from "./object-model.js"

export const
	_validate = Symbol(),

	parseDefinition = (def) => {
		if (isPlainObject(def)) {
			mapProps(def, key => { def[key] = parseDefinition(def[key]) })
		}
		else if (!isArray(def)) return [def]
		else if (def.length === 1) return [...def, undefined, null]

		return def
	},

	formatDefinition = (def, stack) => parseDefinition(def).map(d => format(d, stack)).join(" or "),

	extendDefinition = (def, newParts = []) => {
		if (!isArray(newParts)) newParts = [newParts]
		if (newParts.length > 0) {
			def = newParts
				.reduce((def, ext) => def.concat(ext), isArray(def) ? def.slice() : [def]) // clone to lose ref
				.filter((value, index, self) => self.indexOf(value) === index) // remove duplicates
		}

		return def
	},

	checkDefinition = (obj, def, path, errors, stack) => {
		let indexFound = stack.indexOf(def)
		if (indexFound !== -1 && stack.indexOf(def, indexFound + 1) !== -1)
			return obj //if found twice in call stack, cycle detected, skip validation

		obj = cast(obj, def)

		if (is(Model, def)) {
			def[_validate](obj, path, errors, stack.concat(def))
		}
		else if (isPlainObject(def)) {
			mapProps(def, key => {
				checkDefinition(obj ? obj[key] : undefined, def[key], formatPath(path, key), errors, stack)
			})
		}
		else {
			let pdef = parseDefinition(def)
			if (pdef.some(part => checkDefinitionPart(obj, part, path, stack)))
				return obj

			stackError(errors, def, obj, path)
		}

		return obj
	},

	checkDefinitionPart = (obj, def, path, stack) => {
		if (obj == null) return obj === def
		if (isPlainObject(def) || is(Model, def)) { // object or model as part of union type
			let errors = []
			checkDefinition(obj, def, path, errors, stack)
			return !errors.length
		}
		if (is(RegExp, def)) return def.test(obj)
		if (def === Number || def === Date) return obj.constructor === def && !isNaN(obj)
		return obj === def
			|| (isFunction(def) && is(def, obj))
			|| obj.constructor === def
	},

	checkAssertions = (obj, model, path, errors = model.errors) => {
		for (let assertion of model.assertions) {
			let result
			try {
				result = assertion.call(model, obj)
			} catch (err) {
				result = err
			}
			if (result !== true) {
				let onFail = isFunction(assertion.description) ? assertion.description : (assertionResult, value) =>
					`assertion "${assertion.description}" returned ${format(assertionResult)} `
					+`for ${path ? path+" =" : "value"} ${format(value)}`
				stackError(errors, assertion, obj, path, onFail.call(model, result, obj, path))
			}
		}
	},

	cast = (obj, defNode = []) => {
		if (!obj || isPlainObject(defNode) || isModelInstance(obj))
			return obj // no value or not leaf or already a model instance

		let def = parseDefinition(defNode),
		    suitableModels = []

		for (let part of def) {
			if (is(Model, part) && part.test(obj))
				suitableModels.push(part)
		}

		if (suitableModels.length === 1){
			// automatically cast to suitable model when explicit (duck typing)
			let duck = suitableModels[0];
			return duck instanceof ObjectModel ? new duck(obj) : duck(obj)
		}

		if (suitableModels.length > 1)
			console.warn(`Ambiguous model for value ${format(obj)}, could be ${suitableModels.join(" or ")}`)

		return obj
	}