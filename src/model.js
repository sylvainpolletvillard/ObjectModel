function Model(def, proto){

	if(!isLeaf(def)) return new Model.Object(def, proto);

	var Constructor = function(obj) {
		matchDefinition(obj, def);
		return obj;
	};
	Constructor.toString = toString.bind(this, def);
	Object.setPrototypeOf(Constructor, Model.prototype);
	return Constructor;
}

Model.prototype = Object.create(Function.prototype);
Model.prototype.isValidModelFor = function(obj){
	try {
		new this(obj);
		return true;
	}
	catch(e){
		if(e instanceof TypeError) return false;
		throw e;
	}
};

function isLeaf(def){
	return typeof def != "object" || isArray(def) || def instanceof RegExp;
}

function validateModel(obj, def, path){
	if(isLeaf(def)){
		matchDefinition(obj, def, path);
	} else {
		Object.keys(def).forEach(function(key) {
			var newPath = (path ? [path,key].join('.') : key);
			validateModel(obj instanceof Object ? obj[key] : undefined, def[key], newPath);
		});
	}
}

function matchDefinition(obj, _def, path){
	var def = _def;
	if(!isArray(_def)) {
		def = [_def];
	} else if(def.length < 2){
		def = _def.concat(undefined);
	}

	if (!def.some(function(part){ return matchDefinitionPart(obj, part) })){
		throw new TypeError(
			"expecting " + (path ? path + " to be " : "") + def.map(toString).join(" or ")
			+ ", got " + (obj != null ? bettertypeof(obj) + " " : "") + toString(obj)
		);
	}
}

function matchDefinitionPart(obj, def){
	if(obj == null){
		return obj === def;
	}
	if(isFunction(def) && isFunction(def.isValidModelFor)){
		return def.isValidModelFor(obj);
	}
	if(def instanceof RegExp){
		return def.test(obj);
	}
	return obj === def
		|| (isFunction(def) && obj instanceof def)
		|| obj.constructor === def;
}