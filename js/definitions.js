function matchDefinition(obj, _def, path){
	var def = _def;
	if(!Array.isArray(_def)) {
		def = [_def];
	} else if(def.length < 2){
		def = _def.concat(undefined);
	}

	if (!def.some(function(part){ return matchDefinitionPart(obj, part) })){
		throw new TypeError(
			"expecting " + path + " to be " + def.map(objToString).join(" or ")
			+ ", got " + (obj != null ? bettertypeof(obj) + " " : "") + objToString(obj)
		);
	}
}

function matchDefinitionPart(obj, def){
	if(obj == null){
		return obj === def;
	}
	if(isFunction(def) && (def instanceof ObjectModel || def instanceof ArrayModel || def instanceof FunctionModel)){
		return def.isValidModelFor(obj);
	}
	if(def instanceof RegExp){
		return def.test(obj);
	}
	return obj === def
		|| (isFunction(def) && obj instanceof def)
		|| obj.constructor === def;
}