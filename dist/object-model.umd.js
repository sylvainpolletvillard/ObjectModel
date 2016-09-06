// ObjectModel v2.3.2 - http://objectmodel.js.org
;(function (globals, factory) {
 if (typeof define === 'function' && define.amd) define(factory); // AMD
 else if (typeof exports === 'object') module.exports = factory(); // Node
 else globals['Model'] = factory(); // globals
}(this, function () {
// string constants
var
OBJECT                = "Object",
ARRAY                 = "Array",
FUNCTION              = "Function",
CONVENTION_CONSTANT   = "conventionForConstant",
CONVENTION_PRIVATE    = "conventionForPrivate",
DEFINITION            = "definition",
ASSERTIONS            = "assertions",
ON_FAIL               = "_onFail",
VALIDATE              = "validate",
VALIDATOR             = "_validator",
TEST                  = "test",
EXTEND                = "extend",	
EXPECTED              = "expected",
RECEIVED              = "received",
PATH                  = "path",
MESSAGE               = "message",
ERROR_STACK           = "errorStack",
ERROR_COLLECTOR       = "errorCollector",
UNSTACK               = "unstack",
PROTO                 = "prototype",
CONSTRUCTOR           = "constructor",	
DEFAULTS              = "defaults",
RETURN                = "return",
ARGS                  = "arguments",

ARRAY_MUTATOR_METHODS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"]
;
var isProxySupported = isFunction(this.Proxy);
var defineProperty = Object.defineProperty;

// shim for Function.name for browsers that don't support it. IE, I'm looking at you.
if (!("name" in Function.prototype && "name" in (function x() {}))) {
	defineProperty(Function.prototype, "name", {
		get: function() {
			var results = Function.prototype.toString.call(this).match(/\s*function\s+([^\(\s]*)\s*/);
			return results && results[1];
		}
	});
}

// shim for Object.setPrototypeOf if __proto__ is supported
if(!Object.setPrototypeOf && is(Array, {__proto__:[]})){
	Object.setPrototypeOf = function (obj, proto) {
		obj.__proto__ = proto
		return obj
	}
}

function is(Constructor, obj){
	return obj instanceof Constructor;
}

function isFunction(o){
	return typeof o === "function";
}

function isObject(o){
    return typeof o === "object";
}

function isPlainObject(o){
	return o && isObject(o) && Object.getPrototypeOf(o) === Object.prototype;
}

function bettertypeof(obj){
	return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1];
}

function cloneArray(arr){
	return Array.prototype.slice.call(arr);
}

function merge(target, src, deep) {
	Object.keys(src || {}).forEach(function(key){
		if(deep && isPlainObject(src[key])){
			var o = {};
			merge(o, target[key], deep);
			merge(o, src[key], deep);
			target[key] = o;
		} else {
			target[key] = src[key]
		}
	});
}

function define(obj, key, val, enumerable) {
	defineProperty(obj, key, {
		value: val,
		enumerable: enumerable,
		writable: true,
		configurable: true
	});
}

function setConstructor(model, constructor){
	Object.setPrototypeOf(model, constructor[PROTO]);
	define(model, CONSTRUCTOR, constructor);
}

function setConstructorProto(constructor, proto){
	constructor[PROTO] = Object.create(proto);
	constructor[PROTO][CONSTRUCTOR] = constructor;
}

function toString(obj, stack){
	stack = stack || [];
	if(stack.length > 15 || stack.indexOf(obj) >= 0){ return '...'; }
	if(obj == null){ return String(obj); }
	if(typeof obj == "string"){ return '"'+obj+'"'; }
	if(is(Model, obj)) return obj.toString(stack);
	stack = [obj].concat(stack);
	if(isFunction(obj)){
		return obj.name || obj.toString(stack);
	}
	if(is(Array, obj)){
		return '[' + obj.map(function(item) {
				return toString(item, stack);
			}).join(', ') + ']';
	}
	if(obj.toString !== Object.prototype.toString){
		return obj.toString();
	}
	if(obj && isObject(obj)){
		var indent = (new Array(stack.length)).join('\t');
		var props = Object.keys(obj);
		return '{' + props.map(function(key){
			return '\n' + indent + '\t' + key + ': ' + toString(obj[key], stack);
		}).join(',') + (props.length ? '\n' + indent : '') + '}';
	}
	return String(obj)
}
function Model(def){
	if(!isLeaf(def)) return Model[OBJECT](def);

	var model = function(obj) {
		model[VALIDATE](obj);
		return obj;
	};

	initModel(model, def, Model);
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
	var errorStack = [];
	this[VALIDATOR](obj, null, [], errorStack);
	return !errorStack.length;
};

ModelProto[EXTEND] = function(){
	var def, proto,
		assertions = cloneArray(this[ASSERTIONS]),
		args = cloneArray(arguments);

	if(is(Model[OBJECT], this)){
		def = {};
		proto = {};
		merge(def, this[DEFINITION]);
		merge(proto, this[PROTO]);
		args.forEach(function(arg){
			if(is(Model, arg)){
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

ModelProto.assert = function(assertion, description){
	description = description || toString(assertion);
	var onFail = isFunction(description) ? description : function (assertionResult, value) {
		return "assertion " + description + " returned " + toString(assertionResult) + " for value " + toString(value);
	};
	define(assertion, ON_FAIL, onFail);
	this[ASSERTIONS] = this[ASSERTIONS].concat(assertion);
	return this;
};

ModelProto[ERROR_COLLECTOR] = function(errors){
	throw new TypeError(errors.map(function(e){ return e[MESSAGE]; }).join('\n'));
};

Model[CONVENTION_CONSTANT] = function(key){ return key.toUpperCase() === key };
Model[CONVENTION_PRIVATE] = function(key){ return key[0] === "_" };

// private methods
define(ModelProto, VALIDATOR, function(obj, path, callStack, errorStack){
	checkDefinition(obj, this[DEFINITION], path, callStack, errorStack);
	checkAssertions(obj, this, errorStack);
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

function isLeaf(def){
	return bettertypeof(def) != "Object";
}

function initModel(model, def, constructor){
	setConstructor(model, constructor);
	model[DEFINITION] = def;
	model[ASSERTIONS] = model[ASSERTIONS].slice(); // clone from Model.prototype
	define(model, ERROR_STACK, []);
}

function parseDefinition(def){
	if(isLeaf(def)){
		if(!is(Array, def)) return [def];
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
	if(is(Model, def)){
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
	if(!isLeaf(def) || is(Model, def)){ // object or model as part of union type
		var errorStack = [];
		checkDefinition(obj, def, path, callStack, errorStack);
		return !errorStack.length;
	}
	if(is(RegExp, def)){
		return def[TEST](obj);
	}

	return obj === def
		|| (isFunction(def) && is(def, obj))
		|| obj[CONSTRUCTOR] === def;
}

function checkAssertions(obj, model, errorStack){
	if(errorStack === undefined){
		errorStack = model[ERROR_STACK];
	}
	for(var i=0, l=model[ASSERTIONS].length; i<l ; i++ ){
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
			errorStack.push(err);
		}
	}
}
Model[OBJECT] = function ObjectModel(def){

	var model = function(obj) {
		if(!is(model, this)){
			return new model(obj);
		}
		merge(this, obj, true);
		var proxy = getProxy(model, this, model[DEFINITION]);
		model[VALIDATE](proxy);
		return proxy;
	};

	setConstructorProto(model, Object[PROTO]);
	initModel(model, def, Model[OBJECT]);
	return model;
};

setConstructorProto(Model[OBJECT], ModelProto);
var ObjectModelProto = Model[OBJECT][PROTO];

ObjectModelProto[DEFAULTS] = function(p){
	merge(this[PROTO], p);
	return this;
};

ObjectModelProto.toString = function(stack){
	return toString(this[DEFINITION], stack);
};

// private methods
define(ObjectModelProto, VALIDATOR, function(obj, path, callStack, errorStack){
	if(!isObject(obj)){
		var err = {};
		err[EXPECTED] = this;
		err[RECEIVED] = obj;
		err[PATH] = path;
		errorStack.push(err);
	} else {
		checkDefinition(obj, this[DEFINITION], path, callStack, errorStack);
	}
	checkAssertions(obj, this);
});

function getProxy(model, obj, defNode, path) {
	if(is(Model, defNode) && obj && !is(defNode, obj)) {
		return defNode(obj);
	} else if(is(Array, defNode)){ // union type
		var suitableModels = [];
		for(var i=0, l=defNode.length; i<l; i++){
			var defPart = defNode[i];
			if(is(Model, defPart)){
				if(is(defPart, obj)){
					return obj;
				}
				if(defPart.test(obj)){
					suitableModels.push(defPart);
				}
			}
		}
		if(suitableModels.length === 1){
			return suitableModels[0](obj); // automatically cast to the suitable model when explicit
		} else if(suitableModels.length > 1){
			console.warn("Ambiguous model for value "+toString(obj)+", could be "+suitableModels.join(" or "));
		}
		return obj;
	} else if(isLeaf(defNode)){
		return obj;
	} else {
		var wrapper = is(Object, obj) ? obj : {};
		var proxy = Object.create(Object.getPrototypeOf(wrapper));

		for(var key in wrapper){
			if(wrapper.hasOwnProperty(key) && !(key in defNode)){
				proxy[key] = wrapper[key]; // properties out of model definition are kept
			}
		}

		Object.keys(defNode).forEach(function(key) {
			var newPath = (path ? path + '.' + key : key);
			var isConstant = Model[CONVENTION_CONSTANT](key);
			defineProperty(proxy, key, {
				get: function () {
					return getProxy(model, wrapper[key], defNode[key], newPath);
				},
				set: function (val) {
					if(isConstant && wrapper[key] !== undefined){
						var err = {};
						err[MESSAGE] = "cannot redefine constant " + key;
						model[ERROR_STACK].push(err);
					}
					var newProxy = getProxy(model, val, defNode[key], newPath);
					checkDefinition(newProxy, defNode[key], newPath, [], model[ERROR_STACK]);
					var oldValue = wrapper[key];
					wrapper[key] = newProxy;
					checkAssertions(obj, model);
					if(model[ERROR_STACK].length){
						wrapper[key] = oldValue;
						model[UNSTACK]();
					}
				},
				enumerable: !Model[CONVENTION_PRIVATE](key)
			});
		});
		return proxy;
	}
}
Model[ARRAY] = function ArrayModel(def){

	var model = function(array) {

		var proxy;
		model[VALIDATE](array);
		if(isProxySupported){
			proxy = new Proxy(array, {
				get: function (arr, key) {
					if(key === CONSTRUCTOR){
						return model;
					} else if(ARRAY_MUTATOR_METHODS.indexOf(key) >= 0){
						return proxifyArrayMethod(arr, key, model);
					}
					return arr[key];
				},
				set: function (arr, key, val) {
					setArrayKey(arr, key, val, model);
				},
				getPrototypeOf: function(){
					return model[PROTO];
				}
			});
		} else {
			proxy = Object.create(Array[PROTO]);
			for(var key in array){
				if(array.hasOwnProperty(key)){
					proxifyArrayKey(proxy, array, key, model);
				}
			}
			defineProperty(proxy, "length", { get: function() { return array.length; } });
			defineProperty(proxy, "toJSON", { value: function() { return array; } });
			ARRAY_MUTATOR_METHODS.forEach(function (method) {
				define(proxy, method, proxifyArrayMethod(array, method, model, proxy));
			});
			setConstructor(proxy, model);
		}

		return proxy;
	};

	setConstructorProto(model, Array[PROTO]);
	initModel(model, def, Model[ARRAY]);
	return model;
};

setConstructorProto(Model[ARRAY], Model[PROTO]);
var ArrayModelProto = Model[ARRAY][PROTO];

ArrayModelProto.toString = function(stack){
	return ARRAY + ' of ' + toString(this[DEFINITION], stack);
};

// private methods
define(ArrayModelProto, VALIDATOR, function(arr, path, callStack, errorStack){
	if(!is(Array, arr)){
		var err = {};
		err[EXPECTED] = this;
		err[RECEIVED] = arr;
		err[PATH] = path;
		errorStack.push(err);
	} else {
		for(var i=0, l=arr.length; i<l; i++){
			checkDefinition(arr[i], this[DEFINITION], (path||ARRAY)+'['+i+']', callStack, errorStack);
		}
	}
	checkAssertions(arr, this);
});

function proxifyArrayKey(proxy, array, key, model){
	defineProperty(proxy, key, {
		enumerable: true,
		get: function () {
			return array[key];
		},
		set: function (val) {
			setArrayKey(array, key, val, model);
		}
	});
}

function proxifyArrayMethod(array, method, model, proxy){
	return function() {
		var testArray = array.slice();
		Array[PROTO][method].apply(testArray, arguments);
		model[VALIDATE](testArray);
		if(!isProxySupported){
			for(var key in testArray){
				if(testArray.hasOwnProperty(key) && !(key in proxy)){
					proxifyArrayKey(proxy, array, key, model);
				}
			}
		}
		return Array[PROTO][method].apply(array, arguments);
	};
}

function setArrayKey(array, key, value, model){
	if(parseInt(key) === +key && key >= 0){
		checkDefinition(value, model[DEFINITION], ARRAY+'['+key+']', [], model[ERROR_STACK]);
	}
	var testArray = array.slice();
	testArray[key] = value;
	checkAssertions(testArray, model);
	model[UNSTACK]();
	array[key] = value;
}
Model[FUNCTION] = function FunctionModel(){

	var model = function(fn) {

		var def = model[DEFINITION];
		var proxyFn = function () {
			var args = [];
			merge(args, def[DEFAULTS]);
			merge(args, cloneArray(arguments));
			if (args.length > def[ARGS].length) {
				var err = {};
				err[EXPECTED] = toString(fn) + " to be called with " + def[ARGS].length + " "+ARGS;
				err[RECEIVED] = args.length;
				model[ERROR_STACK].push(err);
			}
			def[ARGS].forEach(function (argDef, i) {
				checkDefinition(args[i], argDef, ARGS + '[' + i + ']', [], model[ERROR_STACK]);
			});
			checkAssertions(args, model);
			var returnValue = fn.apply(this, args);
			if (RETURN in def) {
				checkDefinition(returnValue, def[RETURN], RETURN+' value', [], model[ERROR_STACK]);
			}
			model[UNSTACK]();
			return returnValue;
		};
		setConstructor(proxyFn, model);
		return proxyFn;
	};

	setConstructorProto(model, Function[PROTO]);

	var def = {};
	def[ARGS] = cloneArray(arguments);
	initModel(model, def, Model[FUNCTION]);
	return model;
};

setConstructorProto(Model[FUNCTION], Model[PROTO]);

var FunctionModelProto = Model[FUNCTION][PROTO];

FunctionModelProto.toString = function(stack){
	var out = FUNCTION + '(' + this[DEFINITION][ARGS].map(function(argDef){
		return toString(argDef, stack);
	}).join(",") +')';
	if(RETURN in this[DEFINITION]) {
		out += " => " + toString(this[DEFINITION][RETURN]);
	}
	return out;
};

FunctionModelProto[RETURN] = function(def){
	this[DEFINITION][RETURN] = def;
	return this;
};

FunctionModelProto[DEFAULTS] = function(){
	this[DEFINITION][DEFAULTS] = cloneArray(arguments);
	return this;
};

// private methods
define(FunctionModelProto, VALIDATOR, function(f, path, callStack, errorStack){
	if(!isFunction(f)){
		var err = {};
		err[EXPECTED] = FUNCTION;
		err[RECEIVED] = f;
		err[PATH] = path;
		errorStack.push(err);
	}
});
return Model;
}));