import {is, isArray, isFunction, isModelInstance, isPlainObject, toString} from "./helpers"
import Model, {stackError} from "./model"

export function parseDefinition(def) {
	if (isPlainObject(def)) {
		for (let key of Object.keys(def)) {
			def[key] = parseDefinition(def[key])
		}
	}
	else if (!isArray(def)) return [def]
	else if (def.length === 1) return [...def, undefined, null]

	return def
}

export function extendDefinition(def, newParts = []) {
	if (!isArray(newParts)) newParts = [newParts]
	if (newParts.length > 0) {
		def = newParts
			.reduce((def, ext) => def.concat(ext), isArray(def) ? def.slice() : [def]) // clone to lose ref
			.filter((value, index, self) => self.indexOf(value) === index) // remove duplicates
	}

	return def
}

export function checkDefinition(obj, def, path, errors, stack, shouldCast = false) {
	const indexFound = stack.indexOf(def)
	if (indexFound !== -1 && stack.indexOf(def, indexFound + 1) !== -1)
		return obj //if found twice in call stack, cycle detected, skip validation

	if (shouldCast)
		obj = cast(obj, def)

	if (is(Model, def)) {
		def._validate(obj, path, errors, stack.concat(def))
	}
	else if (isPlainObject(def)) {
		Object.keys(def).forEach(key => {
			const val = obj != null ? obj[key] : undefined
			checkDefinition(val, def[key], path ? path + '.' + key : key, errors, stack)
		})
	}
	else {
		const pdef = parseDefinition(def)
		if (pdef.some(part => checkDefinitionPart(obj, part, path, stack)))
			return obj

		stackError(errors, def, obj, path)
	}

	return obj
}

export function checkDefinitionPart(obj, def, path, stack) {
	if (obj == null) return obj === def
	if (isPlainObject(def) || is(Model, def)) { // object or model as part of union type
		const errors = []
		checkDefinition(obj, def, path, errors, stack)
		return !errors.length
	}
	if (is(RegExp, def)) return def.test(obj)
	if (def === Number || def === Date) return obj.constructor === def && !isNaN(obj)
	return obj === def
		|| (isFunction(def) && is(def, obj))
		|| obj.constructor === def
}


export function checkAssertions(obj, model, path, errors = model.errors) {
	for (let assertion of model.assertions) {
		let result
		try {
			result = assertion.call(model, obj)
		} catch (err) {
			result = err
		}
		if (result !== true) {
			const onFail = isFunction(assertion.description) ? assertion.description : (assertionResult, value) =>
				`assertion "${assertion.description}" returned ${toString(assertionResult)} for value ${toString(value)}`
			stackError(errors, assertion, obj, path, onFail.call(model, result, obj))
		}
	}
}

export function cast(obj, defNode = []) {
	if (!obj || isPlainObject(defNode) || isModelInstance(obj))
		return obj // no value or not leaf or already a model instance

	const def = parseDefinition(defNode);
	const suitableModels = []

	for (let part of def) {
		if (is(Model, part) && part.test(obj))
			suitableModels.push(part)
	}

	if (suitableModels.length === 1) {
		// automatically cast to suitable model when explicit
		const model = suitableModels[0];
		return is(Model, model) ? model(obj) : new model(obj) // basic models should not be called with new
	}

	if (suitableModels.length > 1)
		console.warn(`Ambiguous model for value ${toString(obj)}, could be ${suitableModels.join(" or ")}`)

	return obj
}