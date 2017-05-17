import {is, isPlainObject, isFunction, toString} from "./helpers"
import {BasicModel, parseDefinition} from "./basic-model"

export function checkDefinition(obj, def, path, errorStack, callStack, shouldCast=false){
	const indexFound = callStack.indexOf(def)
	if(indexFound !== -1 && callStack.indexOf(def, indexFound+1) !== -1)
		return obj //if found twice in call stack, cycle detected, skip validation

	if(shouldCast)
		obj = cast(obj, def)


	if(is(BasicModel, def)){
		def._validate(obj, path, errorStack, callStack.concat(def))
	}
	else if(isPlainObject(def)){
		Object.keys(def).forEach(key => {
			const val = obj != null ? obj[key] : undefined
			checkDefinition(val, def[key], path ? path + '.' + key : key, errorStack, callStack)
		})
	}
	else {
		const pdef = parseDefinition(def)
		if(pdef.some(part => checkDefinitionPart(obj, part, path, callStack)))
			return obj

		errorStack.push({
			expected: def,
			received: obj,
			path
		})
	}

	return obj
}

export function checkDefinitionPart(obj, def, path, callStack){
	if(obj == null) return obj === def
	if(isPlainObject(def) || is(BasicModel, def)){ // object or model as part of union type
		const errorStack = []
		checkDefinition(obj, def, path, errorStack, callStack)
		return !errorStack.length
	}
	if(is(RegExp, def)) return def.test(obj)
	if(def === Number || def === Date) return obj.constructor === def && !isNaN(obj)
	return obj === def
		|| (isFunction(def) && is(def, obj))
		|| obj.constructor === def
}


export function checkAssertions(obj, model, path, errorStack = model.errorStack){
	for(let assertion of model.assertions){
		let result
		try {
			result = assertion.call(model, obj)
		} catch(err){
			result = err
		}
		if(result !== true){
			const onFail = isFunction(assertion.description) ? assertion.description : (assertionResult, value) =>
				`assertion "${assertion.description}" returned ${toString(assertionResult)} for value ${toString(value)}`
			errorStack.push({
				message: onFail.call(model, result, obj),
				expected: assertion,
				received: obj,
				path
			})
		}
	}
}

export function cast(obj, defNode=[]) {
	if(!obj || isPlainObject(defNode) || is(BasicModel, obj.constructor))
		return obj // no value or not leaf or already a model instance

	const def = parseDefinition(defNode),
	      suitableModels = []

	for (let part of def) {
		if(is(BasicModel, part) && part.test(obj))
			suitableModels.push(part)
	}

	if (suitableModels.length === 1)
		return new suitableModels[0](obj) // automatically cast to suitable model when explicit

	if (suitableModels.length > 1)
		console.warn(`Ambiguous model for value ${toString(obj)}, could be ${suitableModels.join(" or ")}`)

	return obj
}