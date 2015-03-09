function Model(def){
	if(!isLeaf(def)) return new Model.Object(def);

	var model = function(obj) {
		model.validate(obj);
		return obj;
	};

	return initModel(model, Model, Object.create(isFunction(def) ? def.prototype : null), def);
}

Model.prototype = Object.create(Function.prototype);

Model.prototype.toString = function(ndeep){
	return toString(this.definition, ndeep);
};

var _recursion_stack = [];
Model.prototype.validate = function(obj){
	var isStackTop = (_recursion_stack.length === 0);
	checkModel(obj, this.definition);
	matchAssertions(obj, this.assertions);
	if(isStackTop){ _recursion_stack = []; } // clean stack after validation
};

Model.prototype.isValidModelFor = function(obj){
	try { this.validate(obj); return true; }
	catch(e){ return false; }
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

function checkModel(obj, def, path){
	if(_recursion_stack.indexOf(def) !== -1) return; //if cycle detected, skip validation
	_recursion_stack.push(def);
	if(isLeaf(def)){
		checkDefinitions(obj, def, path);
	} else {
		Object.keys(def).forEach(function(key) {
			var newPath = (path ? [path,key].join('.') : key);
			checkModel(obj instanceof Object ? obj[key] : undefined, def[key], newPath);
		});
	}
}

function checkDefinitions(obj, _def, path){
	var def = parseDefinition(_def);
	if (def.length > 0 && !def.some(function(part){ return checkDefinitionPart(obj, part) }) ){
		throw new TypeError(
			"expecting " + (path ? path + " to be " : "") + def.map(toString).join(" or ")
			+ ", got " + (obj != null ? bettertypeof(obj) + " " : "") + toString(obj) );
	}
}

function checkDefinitionPart(obj, def){
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