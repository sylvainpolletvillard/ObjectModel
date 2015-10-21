function Model(def){
	if(!isLeaf(def)) return Model.Object(def);

	var model = function(obj) {
		model.validate(obj);
		return obj;
	};

	setConstructor(model, Model);
	model.definition = def;
	model.assertions = [];
	return model;
}

setProto(Model, Function.prototype);

Model.prototype.toString = function(stack){
	return toString(this.definition, stack);
};

Model.prototype.validate = function(obj, stack){
	checkDefinition(obj, this.definition, undefined, stack || []);
	matchAssertions(obj, this.assertions);
};

Model.prototype.test = function(obj, stack){
	try { this.validate(obj, stack); return true; }
	catch(e){ return false; }
};

Model.prototype.extend = function(){
	var def, args = cloneArray(arguments);
	if(Model.instanceOf(this, Model.Object)){
		def = {};
		merge(def, this.definition);
		args.forEach(function(arg){
			merge(def, Model.instanceOf(arg, Model) ? arg.definition : arg, true)
		})
	} else {
		def = args.reduce(function(def, ext){ return def.concat(parseDefinition(ext)); }, parseDefinition(this.definition))
			      .filter(function(value, index, self) { return self.indexOf(value) === index; }); // remove duplicates
	}
	var submodel = new this.constructor(def);
	setProto(submodel, this.prototype);
	submodel.assertions = cloneArray(this.assertions);
	return submodel;
};

Model.prototype.assert = function(){
	this.assertions = this.assertions.concat(cloneArray(arguments).filter(isFunction));
	return this;
};

Model.instanceOf = function(obj, Constructor){ // instanceof sham for IE<9
	return canSetProto ? obj instanceof Constructor	: (function recursive(o, stack){
		if(o == null || stack.indexOf(o) !== -1) return false;
		var proto = Object.getPrototypeOf(o);
		stack.push(o);
		return proto === Constructor.prototype || recursive(proto, stack);
	})(obj, [])
};

Model.conventionForConstant = function(key){ return key.toUpperCase() === key };
Model.conventionForPrivate = function(key){ return key[0] === "_" };

function isLeaf(def){
	return bettertypeof(def) != "Object";
}

function parseDefinition(def){
	if(isLeaf(def)){
		if(!isArray(def)) return [def];
		else if(def.length === 1) return def.concat(undefined);
	} else {
		Object.keys(def).forEach(function(key) {
			def[key] = parseDefinition(def[key]);
		});
	}
	return def;
}

function checkDefinition(obj, def, path, stack){
	if(isLeaf(def)){
		def = parseDefinition(def);
		for(var i= 0, l=def.length; i<l; i++){
			if(checkDefinitionPart(obj, def[i], stack)){ return; }
		}
		throw new TypeError("expecting " + (path ? path + " to be " : "") + def.map(function(d){ return toString(d); }).join(" or ")
		+ ", got " + (obj != null ? bettertypeof(obj) + " " : "") + toString(obj) );
	} else {
		Object.keys(def).forEach(function(key) {
			var val = obj != null ? obj[key] : undefined;
			checkDefinition(val, def[key], path ? path + '.' + key : key, stack.concat(val));
		});
	}
}

function checkDefinitionPart(obj, def, stack){
	if(obj == null){
		return obj === def;
	}
	if(Model.instanceOf(def, Model)){
		var indexFound = stack.indexOf(def);
		if(indexFound !== -1 && stack.slice(indexFound+1).indexOf(def) !== -1){
			return true; //if found twice in call stack, cycle detected, skip validation
		}
		return def.test(obj, stack.concat(def));
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