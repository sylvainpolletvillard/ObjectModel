// ObjectModel v1.1.3 - http://objectmodel.js.org
;(function(global){
function isFunction(o){
	return typeof o === "function";
}
function isObject(o){
    return typeof o === "object";
}
function isPlainObject(o){
	return o && isObject(o) && Object.getPrototypeOf(o) === Object.prototype;
}

var isArray = function(a){	return a instanceof Array; };

function toString(obj, stack){
	if(stack && (stack.length > 15 || stack.indexOf(obj) >= 0)){ return '...'; }
	if(obj == null){ return String(obj); }
	if(typeof obj == "string"){ return '"'+obj+'"'; }
	stack = [obj].concat(stack);
	if(isFunction(obj)){ return obj.name || obj.toString(stack); }
	if(isArray(obj)){
		return '[' + obj.map(function(item) {
				return toString(item, stack);
			}).join(', ') + ']';
	}
	if(obj && isObject(obj)){
		var indent = (new Array(stack.length)).join('\t');
		return '{' + Object.keys(obj).map(function(key){
				return '\n\t' + indent + key + ': ' + toString(obj[key], stack);
			}).join(',') + '\n' + indent + '}';
	}
	return String(obj)
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

var canSetProto = !!Object.setPrototypeOf || {__proto__:[]} instanceof Array;
Object.setPrototypeOf = Object.setPrototypeOf || (canSetProto
    ? function(o, p){ o.__proto__ = p; }
    : function(o, p){ for(var k in p){ o[k] = p[k]; } ensureProto(o, p); });

Object.getPrototypeOf = Object.getPrototypeOf && canSetProto ? Object.getPrototypeOf : function(o){
    return o.__proto__ || (o.constructor ? o.constructor.prototype : null);
};

function ensureProto(o, p){
	if(!canSetProto){
		Object.defineProperty(o, "__proto__", { enumerable: false, writable: true, value: p });
	}
}

function setProto(constructor, proto, protoConstructor){
	constructor.prototype = Object.create(proto);
	constructor.prototype.constructor = protoConstructor || constructor;
	ensureProto(constructor.prototype, proto);
}

function setConstructor(model, constructor){
	Object.setPrototypeOf(model, constructor.prototype);
	Object.defineProperty(model, "constructor", { enumerable: false, writable: true, value: constructor });
}

var isProxySupported = (typeof Proxy === "function");
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
	return parseDefinition(this.definition).map(function(d){ return toString(d, stack); }).join(" or ");
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
Model.Object = function ObjectModel(def){

	var model = function(obj) {
		if(!(this instanceof model)){
			return new model(obj);
		}
		merge(this, obj, true);
		var proxy = getProxy(model, this, model.definition);
		model.validate(proxy);
		ensureProto(proxy, model.prototype);
		return proxy;
	};

	setConstructor(model, Model.Object);
	model.definition = def;
	model.assertions = [];
	return model;
};

setProto(Model.Object, Model.prototype, Model);

Model.Object.prototype.defaults = function(p){
	merge(this.prototype, p);
	return this;
};

Model.Object.prototype.toString = function(stack){
	return toString(this.definition, stack);
};

function getProxy(model, obj, defNode, path) {
	if(Model.instanceOf(defNode, Model) && !Model.instanceOf(obj, defNode)) {
		return defNode(obj);
	} else if(isLeaf(defNode)){
		return obj;
	}
	else {
		var wrapper = obj instanceof Object ? obj : {};
		var proxy = Object.create(Object.getPrototypeOf(wrapper));

		for(var key in wrapper){
			if(wrapper.hasOwnProperty(key) && !(key in defNode)){
				proxy[key] = wrapper[key]; // properties out of model definition are kept
			}
		}

		Object.keys(defNode).forEach(function(key) {
			var newPath = (path ? path + '.' + key : key);
			var isConstant = Model.conventionForConstant(key);
			Object.defineProperty(proxy, key, {
				get: function () {
					return getProxy(model, wrapper[key], defNode[key], newPath);
				},
				set: function (val) {
					if(isConstant && wrapper[key] !== undefined){
						throw new TypeError("cannot redefine constant " + key);
					}
					var newProxy = getProxy(model, val, defNode[key], newPath);
					checkDefinition(newProxy, defNode[key], newPath, []);
					var oldValue = wrapper[key];
					wrapper[key] = newProxy;
					try { matchAssertions(obj, model.assertions); }
					catch(e){ wrapper[key] = oldValue; throw e; }
				},
				enumerable: !Model.conventionForPrivate(key)
			});
		});
		return proxy;
	}
}
var ARRAY_MUTATOR_METHODS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];

Model.Array = function ArrayModel(def){

	var model = function(array) {

		var proxy;
		model.validate(array);
		if(isProxySupported){
			proxy = new Proxy(array, {
				get: function (arr, key) {
					return (ARRAY_MUTATOR_METHODS.indexOf(key) >= 0 ? proxifyArrayMethod(arr, key, model) : arr[key]);
				},
				set: function (arr, key, val) {
					setArrayKey(arr, key, val, model);
				}
			});
		} else {
			proxy = Object.create(Array.prototype);
			for(var key in array){
				if(array.hasOwnProperty(key)){
					proxifyArrayKey(proxy, array, key, model);
				}
			}
			Object.defineProperty(proxy, "length", { get: function() { return array.length; } });
			ARRAY_MUTATOR_METHODS.forEach(function (method) {
				Object.defineProperty(proxy, method, {
					configurable: true,
					value: proxifyArrayMethod(array, method, model, proxy)
				});
			});
		}

		setConstructor(proxy, model);
		return proxy;
	};

	setProto(model, Array.prototype);
	setConstructor(model, Model.Array);
	model.definition = def;
	model.assertions = [];
	return model;
};

setProto(Model.Array, Model.prototype, Model);

Model.Array.prototype.validate = function(arr){
	if(!isArray(arr)){
		throw new TypeError("expecting "+this.toString()+", got: " + toString(arr));
	}
	for(var i=0, l=arr.length; i<l; i++){
		checkDefinition(arr[i], this.definition, 'Array['+i+']', []);
	}
	matchAssertions(arr, this.assertions);
};

Model.Array.prototype.toString = function(stack){
	return 'Array of ' + toString(this.definition, stack);
};

function proxifyArrayKey(proxy, array, key, model){
	Object.defineProperty(proxy, key, {
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
		Array.prototype[method].apply(testArray, arguments);
		model.validate(testArray);
		if(!isProxySupported){
			for(var key in testArray){
				if(testArray.hasOwnProperty(key) && !(key in proxy)){
					proxifyArrayKey(proxy, array, key, model);
				}
			}
		}
		return Array.prototype[method].apply(array, arguments);
	};
}

function setArrayKey(array, key, value, model){
	if(parseInt(key) === +key && key >= 0){
		checkDefinition(value, model.definition, 'Array['+key+']', []);
	}
	var testArray = array.slice();
	testArray[key] = value;
	matchAssertions(testArray, model.assertions);
	array[key] = value;
}
Model.Function = function FunctionModel(){

	var model = function(fn) {

		var def = model.definition;
		var proxyFn = function () {
			var args = [];
			merge(args, def.defaults);
			merge(args, cloneArray(arguments));
			if (args.length !== def.arguments.length) {
				throw new TypeError("expecting " + toString(fn) + " to be called with " + def.arguments.length + " arguments, got " + args.length);
			}
			def.arguments.forEach(function (argDef, i) {
				checkDefinition(args[i], argDef, 'arguments[' + i + ']', []);
			});
			matchAssertions(args, model.assertions);
			var returnValue = fn.apply(this, args);
			if ("return" in def) {
				checkDefinition(returnValue, def.return, 'return value', []);
			}
			return returnValue;
		};
		setConstructor(proxyFn, model);
		return proxyFn;
	};

	setProto(model, Function.prototype);
	setConstructor(model, Model.Function);
	model.definition = { arguments: cloneArray(arguments) };
	model.assertions = [];
	return model;
};

setProto(Model.Function, Model.prototype, Model);

Model.Function.prototype.validate = function (f) {
	if(!isFunction(f)){
		throw new TypeError("expecting a function, got: " + toString(f));
	}
};

Model.Function.prototype.toString = function(stack){
	var out = 'Model.Function('+this.definition.arguments.map(function(argDef){ return toString(argDef, stack); }).join(",") +')';
	if("return" in this.definition) {
		out += ".return(" + toString(this.definition.return) + ")";
	}
	return out;
};

Model.Function.prototype.return = function(def){
	this.definition.return = def;
	return this;
};

Model.Function.prototype.defaults = function(){
	this.definition.defaults = cloneArray(arguments);
	return this;
};

global.Model = Model;
})(this);