function Model(def){
	if(!isLeaf(def)) return new Model.Object(def);

	var model = function(obj) {
		model.validate(obj);
		return obj;
	}.bind(this);

	Object.setPrototypeOf(model, Model.prototype);
	model.constructor = Model;
	model.prototype = Object.create(isFunction(def) ? def.prototype : null);
	model.prototype.constructor = model;
	model.definition = parseDefinition(def);
	model.assertions = [];
	return model;
}

Model.prototype = Object.create(Function.prototype);

Model.prototype.toString = function(ndeep){
	return toString(this.definition, ndeep);
};

Model.prototype.validate = function(obj){
	matchDefinitions(obj, this.definition);
	matchAssertions(obj, this.assertions);
};

Model.prototype.isValidModelFor = function(obj){
	try { this.validate(obj); return true; }
	catch(e){ return false; }
};

Model.prototype.extend = function(ext){
	var submodel = new Model(this.definition.concat(parseDefinition(ext)));
	submodel.prototype = Object.create(this.prototype);
	submodel.prototype.constructor = submodel;
	submodel.assertions = this.assertions;
	return submodel;
};

Model.prototype.assert = function(assertion){
	if(isFunction(assertion)){
		this.assertions.push(assertion);
	}
	return this;
};

function isLeaf(def){
	return typeof def != "object" || isArray(def) || def instanceof RegExp;
}

function parseDefinition(def){
	if(isLeaf(def)){
		if(!isArray(def)) {
			return [def];
		} else if(def.length < 2){
			return def.concat(undefined);
		}
	} else {
		Object.keys(def).forEach(function(key) {
			def[key] = parseDefinition(def[key]);
		});
	}
	return def;
}

function matchDefinitions(obj, def, path){
	if (!def.some(function(part){ return matchDefinitionPart(obj, part) }) ){
		throw new TypeError(
			"expecting " + (path ? path + " to be " : "") + def.map(toString).join(" or ")
			+ ", got " + (obj != null ? bettertypeof(obj) + " " : "") + toString(obj) );
	}
}

function matchDefinitionPart(obj, def){
	if(obj == null){
		return obj === def;
	}
	if(def instanceof Model){
		return def.isValidModelFor(obj);
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