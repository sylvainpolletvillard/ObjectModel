function Model(def){
	if(!isLeaf(def)) return Model[OBJECT](def);

	var model = function(obj) {
		model[VALIDATE](obj);
		return obj;
	};

	setConstructor(model, Model);
	model[DEFINITION] = def;
	model[ASSERTIONS] = [];
	model[ERROR_STACK] = [];
	return model;
}

setProto(Model, Function[PROTO]);
var ModelProto = Model[PROTO];

ModelProto.toString = function(stack){
	return parseDefinition(this[DEFINITION]).map(function(d){
		return toString(d, stack);
	}).join(" or ");
};

ModelProto[VALIDATE] = function(obj, errorCollector){
	this[VALIDATOR](obj, null, [], this[ERROR_STACK]);
	this[UNSTACK](errorCollector);
};

ModelProto.test = function(obj){
	var errorStack = [];
	this[VALIDATOR](obj, null, [], errorStack);
	return !errorStack.length;
};

ModelProto.extend = function(){
	var def, proto,
		assertions = cloneArray(this[ASSERTIONS]),
		args = cloneArray(arguments);

	if(Model[INSTANCEOF](this, Model[OBJECT])){
		def = {};
		proto = {};
		merge(def, this[DEFINITION]);
		merge(proto, this[PROTO]);
		args.forEach(function(arg){
			if(Model[INSTANCEOF](arg, Model)){
				merge(def, arg[DEFINITION], true);
				merge(proto, arg[PROTO], true);
			} else {
				merge(def, arg, true);
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
		if(Model[INSTANCEOF](arg, Model)){
			assertions = assertions.concat(arg[ASSERTIONS]);
		}
	});

	var submodel = new this.constructor(def);
	setProto(submodel, this[PROTO]);
	merge(submodel[PROTO], proto);
	submodel[ASSERTIONS] = assertions;
	return submodel;
};

ModelProto.assert = function(assertion, message){
	define(assertion, DESCRIPTION, message);
	this[ASSERTIONS].push(assertion);
	return this;
};

ModelProto.errorCollector = function(errors){
	throw new TypeError(errors.map(function(e){ return e[MESSAGE]; }).join('\n'));
};

Model[INSTANCEOF] = function(obj, Constructor){ // instanceof sham for IE<9
	return canSetProto ? obj instanceof Constructor	: (function recursive(o, stack){
		if(o == null || stack.indexOf(o) !== -1) return false;
		var proto = Object.getPrototypeOf(o);
		stack.push(o);
		return proto === Constructor[PROTO] || recursive(proto, stack);
	})(obj, [])
};

Model[CONVENTION_CONSTANT] = function(key){ return key.toUpperCase() === key };
Model[CONVENTION_PRIVATE] = function(key){ return key[0] === "_" };

// private methods
define(ModelProto, VALIDATOR, function(obj, path, callStack, errorStack){
	checkDefinition(obj, this[DEFINITION], path, callStack, errorStack);
	matchAssertions(obj, this[ASSERTIONS], errorStack);
});

// throw all errors collected
define(ModelProto, UNSTACK, function(errorCollector){
	if(!this[ERROR_STACK].length){
		return;
	}
	if(!errorCollector){
		errorCollector = this.errorCollector;
	}
	var errors = this[ERROR_STACK].map(function(err){
		if(!err[MESSAGE]){
			var def = isArray(err[EXPECTED]) ? err[EXPECTED] : [err[EXPECTED]];
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
	var err;
	if(Model[INSTANCEOF](def, Model)){
		var indexFound = callStack.indexOf(def);
		if(indexFound !== -1 && callStack.slice(indexFound+1).indexOf(def) !== -1){
			return; //if found twice in call stack, cycle detected, skip validation
		}
		return def[VALIDATOR](obj, path, callStack.concat(def), errorStack);
	} else if(isLeaf(def)){
		var pdef = parseDefinition(def);
		for(var i= 0, l=pdef.length; i<l; i++){
			if(checkDefinitionPart(obj, pdef[i], path, callStack)){
				return;
			}
		}
		err = {};
		err[EXPECTED] = def;
		err[RECEIVED] = obj;
		err[PATH] = path;
		errorStack.push(err);
	} else {
		Object.keys(def).forEach(function(key) {
			var val = obj != null ? obj[key] : undefined;
			checkDefinition(val, def[key], path ? path + '.' + key : key, callStack, errorStack);
		});
	}
}

function checkDefinitionPart(obj, def, path, callStack){
	if(obj == null){
		return obj === def;
	}
	if(!isLeaf(def) || Model[INSTANCEOF](def, Model)){ // object or model as part of union type
		var errorStack = [];
		checkDefinition(obj, def, path, callStack, errorStack);
		return !errorStack.length;
	}
	if(def instanceof RegExp){
		return def.test(obj);
	}

	return obj === def
		|| (isFunction(def) && obj instanceof def)
		|| obj.constructor === def;
}

function matchAssertions(obj, assertions, errorStack){
	for(var i=0, l=assertions.length; i<l ; i++ ){
		if(!assertions[i](obj)){
			var err = {};
			err[MESSAGE] = "assertion failed: "+ (assertions[i][DESCRIPTION] || toString(assertions[i]))
			errorStack.push(err);
		}
	}
}