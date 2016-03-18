function Model(def){
	if(!isLeaf(def)) return Model.Object(def);

	var model = function(obj) {
		model.validate(obj);
		return obj;
	};

	setConstructor(model, Model);
	model.definition = def;
	model.assertions = [];
	model.errorStack = [];
	return model;
}

setProto(Model, Function.prototype);

Model.prototype.toString = function(stack){
	return parseDefinition(this.definition).map(function(d){
		return toString(d, stack);
	}).join(" or ");
};

Model.prototype.validate = function(obj, errorCollector){
	this.validator(obj, []);
	this.unstack(errorCollector);
};

Model.prototype.test = function(obj){
	return test.call(this, obj, []);
};

Model.prototype.extend = function(){
	var def, proto,
		assertions = cloneArray(this.assertions),
		args = cloneArray(arguments);

	if(Model.instanceOf(this, Model.Object)){
		def = {};
		proto = {};
		merge(def, this.definition);
		merge(proto, this.prototype);
		args.forEach(function(arg){
			if(Model.instanceOf(arg, Model)){
				merge(def, arg.definition, true);
				merge(proto, arg.prototype, true);
			} else {
				merge(def, arg, true);
			}
		})
	} else {
		def = args.reduce(function(def, ext){ return def.concat(parseDefinition(ext)); }, parseDefinition(this.definition))
			      .filter(function(value, index, self) { return self.indexOf(value) === index; }); // remove duplicates
	}

	args.forEach(function(arg){
		if(Model.instanceOf(arg, Model)){
			assertions = assertions.concat(arg.assertions);
		}
	});

	var submodel = new this.constructor(def);
	setProto(submodel, this.prototype);
	merge(submodel.prototype, proto);
	submodel.assertions = assertions;
	return submodel;
};

Model.prototype.assert = function(assertion, message){
	define(assertion, "description", message);
	this.assertions.push(assertion);
	return this;
};

Model.prototype.errorCollector = function(errors){
	throw new TypeError(errors.map(function(e){ return e.message; }).join('\n'));
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

// private methods
define(Model.prototype, "validator", function(obj, stack){
	checkDefinition(obj, this.definition, null, stack || [], this.errorStack);
	matchAssertions(obj, this.assertions, this.errorStack);
});

// throw all errors collected
define(Model.prototype, "unstack", function(errorCollector){
	if(this.errorStack.length === 0){
		return;
	}
	if(!errorCollector){
		errorCollector = this.errorCollector;
	}
	var errors = this.errorStack.map(function(err){
		if(!err.message){
			var expected = isArray(err.expected) ? err.expected : [err.expected];
			err.message = ("expecting " + (err.path ? err.path + " to be " : "")
			+ expected.map(function(d){ return toString(d); }).join(" or ")
			+ ", got " + (err.result != null ? bettertypeof(err.result) + " " : "")
			+ toString(err.result))
		}
		return err;
	});
	this.errorStack = [];
	errorCollector.call(this, errors);
})

function isLeaf(def){
	return bettertypeof(def) != "Object";
}

function parseDefinition(def){
	if(isLeaf(def)){
		if(!isArray(def)) return [def];
		else if(def.length === 1) return def.concat(undefined, null);
	} else {
		Object.keys(def).forEach(function(key) {
			def[key] = parseDefinition(def[key]);
		});
	}
	return def;
}

function checkDefinition(obj, def, path, callStack, errorStack){
	if(isLeaf(def)){
		def = parseDefinition(def);
		for(var i= 0, l=def.length; i<l; i++){
			if(checkDefinitionPart(obj, def[i], path, callStack)){ return; }
		}
		errorStack.push({
			expected: def,
			result: obj,
			path: path
		});
	} else {
		Object.keys(def).forEach(function(key) {
			var val = obj != null ? obj[key] : undefined;
			checkDefinition(val, def[key], path ? path + '.' + key : key, callStack.concat(val), errorStack);
		});
	}
}

function checkDefinitionPart(obj, def, path, callStack){
	if(obj == null){
		return obj === def;
	}
	if(!isLeaf(def)){
		var errorStack=[];
		checkDefinition(obj, def, path, callStack, errorStack);
		return errorStack.length === 0;
	}
	if(Model.instanceOf(def, Model)){
		var indexFound = callStack.indexOf(def);
		if(indexFound !== -1 && callStack.slice(indexFound+1).indexOf(def) !== -1){
			return true; //if found twice in call stack, cycle detected, skip validation
		}
		return test.call(def, obj, callStack.concat(def));
	}
	if(def instanceof RegExp){
		return def.test(obj);
	}

	return obj === def
		|| (isFunction(def) && obj instanceof def)
		|| obj.constructor === def;
}

function test(obj, callStack){
	var ok = true;
	this.validator(obj, callStack);
	this.unstack(function(){ ok = false; });
	return ok;
}

function matchAssertions(obj, assertions, errorStack){
	for(var i=0, l=assertions.length; i<l ; i++ ){
		if(!assertions[i](obj)){
			errorStack.push({
				message: "assertion failed: "+ (assertions[i].description || toString(assertions[i]))
			});
		}
	}
}