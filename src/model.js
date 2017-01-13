function Model(def){
	if(isPlainObject(def)) return Model[OBJECT](def);

	var model = function(obj) {
		obj = defaultTo(model[DEFAULT], obj);
		model[VALIDATE](obj);
		return obj;
	};

	initModel(model, arguments, Model);
	return model;
}

setConstructorProto(Model, Function[PROTO]);
var ModelProto = Model[PROTO];

ModelProto.toString = function(stack){
	return parseDefinition(this[DEFINITION]).map(function(d){
		return toString(d, stack);
	}).join(" or ");
};

ModelProto[ASSERTIONS] = [];

ModelProto[VALIDATE] = function(obj, errorCollector){
	this[VALIDATOR](obj, null, [], this[ERROR_STACK]);
	this[UNSTACK](errorCollector);
};

ModelProto[TEST] = function(obj){
	var failed,
	    initialErrorCollector = this[ERROR_COLLECTOR];
	this[ERROR_COLLECTOR] = function(){ failed = true };
	this(obj);
	this[ERROR_COLLECTOR] = initialErrorCollector;
	return !failed;
};

ModelProto[EXTEND] = function(){
	var def, proto,
		assertions = cloneArray(this[ASSERTIONS]),
		args = cloneArray(arguments);

	if(is(Model[OBJECT], this)){
		def = {};
		proto = {};
		merge(def, this[DEFINITION]);
		merge(proto, this[PROTO], false, true);
		args.forEach(function(arg){
			if(is(Model, arg)){
				merge(def, arg[DEFINITION], true);
			}
			if(isFunction(arg)){
				merge(proto, arg[PROTO], true, true);
			}
			if(isObject(arg)) {
				merge(def, arg, true, true);
			}
		})
	} else {
		def = args
			.reduce(function(def, ext){
				return def.concat(parseDefinition(ext));
			}, parseDefinition(this[DEFINITION]))
			.filter(function(value, index, self) {
				return self.indexOf(value) === index; // remove duplicates
			});
	}

	args.forEach(function(arg){
		if(is(Model, arg)){
			assertions = assertions.concat(arg[ASSERTIONS]);
		}
	});

	var submodel = new this[CONSTRUCTOR](def);
	setConstructorProto(submodel, this[PROTO]);
	merge(submodel[PROTO], proto);
	submodel[ASSERTIONS] = assertions;
	submodel[ERROR_COLLECTOR] = this[ERROR_COLLECTOR];
	return submodel;
};

ModelProto[ASSERT] = function(assertion, description){
	description = description || toString(assertion);
	var onFail = isFunction(description) ? description : function (assertionResult, value) {
		return 'assertion "' + description + '" returned ' + toString(assertionResult) + ' for value ' + toString(value);
	};
	define(assertion, ON_FAIL, onFail);
	this[ASSERTIONS] = this[ASSERTIONS].concat(assertion);
	return this;
};

ModelProto[DEFAULT_TO] = function(val){
	this[DEFAULT] = val;
	return this;
}

ModelProto[ERROR_COLLECTOR] = function(errors){
	var e = new TypeError(errors.map(function(e){ return e[MESSAGE]; }).join('\n'));
	if(e.stack){
		e.stack = e.stack.replace(STACKTRACE_BLACKBOX_MATCHER, "");
	}
	throw e;
};

Model[CONVENTION_CONSTANT] = function(key){ return key.toUpperCase() === key };
Model[CONVENTION_PRIVATE] = function(key){ return key[0] === "_" };

// private methods
define(ModelProto, VALIDATOR, function(obj, path, callStack, errorStack){
	checkDefinition(obj, this[DEFINITION], path, callStack, errorStack);
	checkAssertions(obj, this, path, errorStack);
});

// throw all errors collected
define(ModelProto, UNSTACK, function(errorCollector){
	if(!this[ERROR_STACK].length){
		return;
	}
	if(!errorCollector){
		errorCollector = this[ERROR_COLLECTOR];
	}
	var errors = this[ERROR_STACK].map(function(err){
		if(!err[MESSAGE]){
			var def = is(Array, err[EXPECTED]) ? err[EXPECTED] : [err[EXPECTED]];
			err[MESSAGE] = ("expecting " + (err[PATH] ? err[PATH] + " to be " : "")
			+ def.map(function(d){ return toString(d); }).join(" or ")
			+ ", got " + (err[RECEIVED] != null ? bettertypeof(err[RECEIVED]) + " " : "")
			+ toString(err[RECEIVED]))
		}
		return err;
	});
	this[ERROR_STACK] = [];
	errorCollector.call(this, errors);
})

function initModel(model, args, constructor){
	if(args.length === 0) throw new Error("Model definition is required");
	setConstructor(model, constructor);
	model[DEFINITION] = args[0];
	model[ASSERTIONS] = model[ASSERTIONS].slice(); // clone from Model.prototype
	define(model, ERROR_STACK, []);
}

function parseDefinition(def){
	if(!isPlainObject(def)){
		if(!is(Array, def)) return [def];
		if(def.length === 1) return def.concat(undefined, null);
	} else {
		Object.keys(def).forEach(function(key) {
			def[key] = parseDefinition(def[key]);
		});
	}
	return def;
}

function checkDefinition(obj, def, path, callStack, errorStack, shouldAutoCast){
	var indexFound = callStack.indexOf(def);
	if(indexFound !== -1 && callStack.slice(indexFound+1).indexOf(def) !== -1){
		return obj; //if found twice in call stack, cycle detected, skip validation
	}

	if(shouldAutoCast) {
		obj = autocast(obj, def);
	}

	if(is(Model, def)){
		def[VALIDATOR](obj, path, callStack.concat(def), errorStack);
	}
	else if(isPlainObject(def)) {
		Object.keys(def).forEach(function (key) {
			var val = obj != null ? obj[key] : undefined;
			checkDefinition(val, def[key], path ? path + '.' + key : key, callStack, errorStack);
		});
	} else {
		var pdef = parseDefinition(def);
		for(var i=0, l=pdef.length; i<l; i++){
			if(checkDefinitionPart(obj, pdef[i], path, callStack)){
				return obj;
			}
		}
		var err = {};
		err[EXPECTED] = def;
		err[RECEIVED] = obj;
		err[PATH] = path;
		errorStack.push(err);
	}
	return obj;
}

function checkDefinitionPart(obj, def, path, callStack){
	if(obj == null){
		return obj === def;
	}
	if(isPlainObject(def) || is(Model, def)){ // object or model as part of union type
		var errorStack = [];
		checkDefinition(obj, def, path, callStack, errorStack);
		return !errorStack.length;
	}
	if(is(RegExp, def)){
		return def.test(obj);
	}
	if(def === Number || def === Date){
		return obj[CONSTRUCTOR] === def && !isNaN(obj)
	}

	return obj === def
		|| (isFunction(def) && is(def, obj))
		|| obj[CONSTRUCTOR] === def;
}

function checkAssertions(obj, model, path, errorStack){
	for(var i=0, l=model[ASSERTIONS].length; i<l ; i++){
		var assert = model[ASSERTIONS][i],
			assertionResult;
		try {
			assertionResult = assert.call(model, obj);
		} catch(err){
			assertionResult = err;
		}
		if(assertionResult !== true){
			var err = {};
			err[MESSAGE] = assert[ON_FAIL].call(model, assertionResult, obj)
			err[RECEIVED] = obj;
			err[PATH] = path;
			errorStack.push(err);
		}
	}
}

function autocast(obj, defNode){
	if(!obj || is(Model, obj[CONSTRUCTOR])){
		return obj; // no value or already a model instance
	}

	var def = parseDefinition(defNode || []),
	    suitableModels = [];

	for(var i=0, l=def.length; i<l; i++){
		var defPart = def[i];
		if(is(Model, defPart) && defPart[TEST](obj)){
			suitableModels.push(defPart);
		}
	}

	var nbSuitableModels = suitableModels.length;
	if(nbSuitableModels === 1) {
		return suitableModels[0](obj); // automatically cast to the suitable model when explicit
	}
	if(nbSuitableModels > 1){
		console.warn("Ambiguous model for value " + toString(obj)
			+ ", could be " + suitableModels.join(" or "));
	}

	return obj;
}