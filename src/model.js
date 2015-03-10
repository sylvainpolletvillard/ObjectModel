function Model(def){
	if(!isLeaf(def)) return new Model.Object(def);

	var model = function(obj) {
		model.validate(obj, []);
		return obj;
	};

	return initModel(model, Model, Object.create(isFunction(def) ? def.prototype : null), def);
}

Model.prototype = Object.create(Function.prototype);

Model.prototype.toString = function(ndeep){
	return toString(this.definition, ndeep);
};

Model.prototype.validate = function(obj, called){
	checkModel(obj, this.definition, undefined, called);
	matchAssertions(obj, this.assertions);
};

Model.prototype.extend = function(){
	var submodel = new this.constructor(mergeDefinitions(this.definition, arguments));
	submodel.prototype = Object.create(this.prototype);
	submodel.prototype.constructor = submodel;
	submodel.assertions = cloneArray(this.assertions);
	return submodel;
};

Model.prototype.assert = function(){
	this.assertions = this.assertions.concat(cloneArray(arguments).filter(isFunction));
	return this;
};

function initModel(model, constructor, proto, def){
	model.constructor = constructor;
	model.prototype = proto;
	model.prototype.constructor = model;
	model.definition = def;
	model.assertions = [];
	Object.setPrototypeOf(model, constructor.prototype);
	return model;
}

function isLeaf(def){
	return bettertypeof(def) != "Object";
}

function mergeDefinitions(base, exts){
	if(exts.length === 0) return base;
	if(isLeaf(base)){
		return cloneArray(exts).reduce(function(def, ext){ return def.concat(parseDefinition(ext)); }, parseDefinition(base)).filter(onlyUnique);
	} else {
		return cloneArray(exts).reduce(function(def, ext){ return merge(ext || {}, def); }, base);
	}
}

function parseDefinition(def){
	if(isLeaf(def)){
		if(!isArray(def)) {
			return [def];
		} else if(def.length === 1){
			return def.concat(undefined);
		}
	} else {
		Object.keys(def).forEach(function(key) {
			def[key] = parseDefinition(def[key]);
		});
	}
	return def;
}

function checkModel(obj, def, path, called){
	if(isLeaf(def)){
		checkDefinitions(obj, def, path, called.concat(def));
	} else {
		Object.keys(def).forEach(function(key) {
			var newPath = (path ? [path,key].join('.') : key);
			var val = obj instanceof Object ? obj[key] : undefined;
			checkModel(val, def[key], newPath, called.concat(val));
		});
	}
}

function checkDefinitions(obj, _def, path, called){
	var def = parseDefinition(_def);
	if (def.length > 0 && !def.some(function(part){ return checkDefinitionPart(obj, part, called) }) ){
		throw new TypeError(
			"expecting " + (path ? path + " to be " : "") + def.map(toString).join(" or ")
			+ ", got " + (obj != null ? bettertypeof(obj) + " " : "") + toString(obj) );
	}
}

function checkDefinitionPart(obj, def, called){
	if(obj == null){
		return obj === def;
	}
	if(def instanceof Model){
		var indexFound = called.indexOf(def);
		if(indexFound !== -1 && called.slice(indexFound+1).indexOf(def) !== -1){
			return true; //if found twice in call stack, cycle detected, skip validation
		}
		try { def.validate(obj, called.concat(def)); return true; }
		catch(e){ return false; }
	}
	if(def instanceof RegExp){
		return def.test(obj);
	}
	return obj === def
		|| (isFunction(def) && obj instanceof def)
		|| obj.constructor === def;
}

function matchAssertions(obj, assertions){
	for(var i=0, l=assertions.length; i<l ; i++ ){
		if(!assertions[i](obj)){
			throw new TypeError("an assertion of the model is not respected: "+toString(assertions[i]));
		}
	}
}