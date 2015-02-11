(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (globals, factory) {
 if (typeof define === 'function' && define.amd) define(factory); // AMD
 else if (typeof exports === 'object') module.exports = factory(); // Node
 else globals['Model'] = factory(); // globals
}(this, function () {
function isFunction(o){
	return typeof o === "function";
}

var isArray = Array.isArray || function(a){
	return a instanceof Array
};

function toString(obj, ndeep){
	if(ndeep === undefined){ ndeep = 1; }
	if(obj == null){ return String(obj); }
	if(typeof obj == "string"){ return '"'+obj+'"'; }
	if(typeof obj == "function"){ return obj.name || obj.toString(ndeep); }
	if(isArray(obj)){
		return '[' + obj.map(function(item) {
				return toString(item, ndeep);
			}).join(', ') + ']';
	}
	if(obj && typeof obj == "object"){
		var indent = (new Array(ndeep)).join('\t');
		return '{' + Object.keys(obj).map(function(key){
				return '\n\t' + indent + key + ': ' + toString(obj[key], ndeep+1);
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

function merge(base, ext, replace){
	if(ext instanceof Object){
		for(var p in ext){
			if(ext.hasOwnProperty(p)){
				if(base.hasOwnProperty(p)){
					if(base[p] instanceof Object){
						merge(base[p], ext[p], replace);
					} else if(replace){
						base[p] = ext[p];
					}
				} else {
					base[p] = ext[p];
				}
			}
		}
	}
	return base
}

Number.isInteger = Number.isInteger || function(value) {
	return typeof value === "number" &&
		isFinite(value) &&
		Math.floor(value) === value;
};

Object.setPrototypeOf = Object.setPrototypeOf || ({__proto__:[]} instanceof Array
	? function(o, p){ o.__proto__ = p; }
	: function(o, p){ for(var k in p){ o[k] = p[k]; } });
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
Model.Object = function ObjectModel(def){

	var model = function(obj) {
		if(!(this instanceof model)){
			return new model(obj);
		}
		merge(this, obj, true);
		var proxy = getProxy(this, model.definition);
		validateObjectModel(proxy, model.definition);
		return proxy;
	};

	Object.setPrototypeOf(model, ObjectModel.prototype);
	model.constructor = ObjectModel;
	model.prototype = Object.create(Object.prototype);
	model.prototype.constructor = model;
	model.definition = parseDefinition(def);
	model.assertions = [];
	return model;
};

Model.Object.prototype = Object.create(Model.prototype);

Model.Object.prototype.validate = function(obj){
	validateObjectModel(obj, this.definition);
	matchAssertions(obj, this.assertions);
};

Model.Object.prototype.extend = function(extendedDefinition){
	var submodel = new Model.Object(merge(extendedDefinition || {}, this.definition));
	submodel.prototype = Object.create(this.prototype);
	submodel.prototype.constructor = submodel;
	submodel.assertions = cloneArray(this.assertions);
	return submodel;
};

Model.Object.prototype.defaults = function(p){
	merge(this.prototype, p);
	return this;
};

function validateObjectModel(obj, def, path){
	if(isLeaf(def)){
		matchDefinitions(obj, def, path);
	} else {
		Object.keys(def).forEach(function(key) {
			var newPath = (path ? [path,key].join('.') : key);
			validateObjectModel(obj instanceof Object ? obj[key] : undefined, def[key], newPath);
		});
	}
}

function getProxy(obj, def, path) {
	if(def instanceof Model.Function){
		return def(obj);
	} else if(isLeaf(def)){
		matchDefinitions(obj, def, path);
		return obj;
	} else {
		var wrapper = obj instanceof Object ? obj : Object.create(null);
		var proxy = Object.create(Object.getPrototypeOf(wrapper));
		Object.keys(def).forEach(function(key) {
			var newPath = (path ? [path,key].join('.') : key);
			var isWritable = (key.toUpperCase() != key);
			Object.defineProperty(proxy, key, {
				get: function () {
					return getProxy(wrapper[key], def[key], newPath);
				},
				set: function (val) {
					if(!isWritable && wrapper[key] !== undefined){
						throw new TypeError("cannot redefine constant "+key);
					}
					var newProxy = getProxy(val, def[key], newPath);
					if(!isLeaf(def[key])){
						validateObjectModel(newProxy, def[key], newPath);
					}
					wrapper[key] = newProxy;
				},
				enumerable: (key[0] !== "_")
			});
		});
		return proxy;
	}
}
var ARRAY_MUTATOR_METHODS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];

Model.Array = function ArrayModel(def){

	var model = function() {
		var array = cloneArray(arguments);
		if(!(this instanceof model)){
			return new (Function.prototype.bind.apply(model, [null].concat(array)));
		}

		model.validate(array);
		var proxy = this;

		ARRAY_MUTATOR_METHODS.forEach(function (method) {
			Object.defineProperty(proxy, method, { configurable: true, value: function() {
				var testArray = array.slice();
				Array.prototype[method].apply(testArray, arguments);
				model.validate(testArray);
				var newKeys = Object.keys(testArray).filter(function(key){ return !(key in proxy) });
				proxifyKeys(proxy, array, newKeys, model.definition);
				return Array.prototype[method].apply(array, arguments);
			}});
		});

		proxifyKeys(proxy, array, Object.keys(array), model.definition);
		Object.defineProperty(proxy, "length", {
			enumerable: false,
			get: function(){ return array.length; }
		});
		return proxy;
	};

	Object.setPrototypeOf(model, ArrayModel.prototype);
	model.prototype = Object.create(Array.prototype);
	model.prototype.constructor = model;
	model.definition = parseDefinition(def);
	model.assertions = [];
	return model;
};

Model.Array.prototype = Object.create(Model.prototype);

Model.Array.prototype.validate = function(arr){
	if(!isArray(arr)){
		throw new TypeError("expecting an array, got: " + toString(arr));
	}
	for(var i=0, l=arr.length; i<l; i++){
		matchDefinitions(arr[i], this.definition, 'Array['+i+']');
	}
	matchAssertions(arr, this.assertions);
};

Model.Array.prototype.toString = function(ndeep){
	return 'Model.Array(' + toString(this.definition, ndeep) + ')';
};

Model.Array.prototype.extend = function(ext){
	var subModel = new Model.Array(this.definition.concat(parseDefinition(ext)));
	subModel.prototype = Object.create(this.prototype);
	subModel.prototype.constructor = subModel;
	subModel.assertions = cloneArray(this.assertions);
	return subModel;
};

function proxifyKeys(proxy, array, indexes, def){
	indexes.forEach(function(index){
		Object.defineProperty(proxy, index, {
			get: function () {
				return array[index];
			},
			set: function (val) {
				matchDefinitions(val, def, 'Array['+index+']');
				array[index] = val;
			}
		});
	});
}
Model.Function = function FunctionModel(){

	var model = function(fn) {
		if(!(this instanceof model)) {
			return new model(fn);
		}

		var def = model.definition;
		var proxyFn = function () {
			var args = merge(cloneArray(arguments), def.defaults);
			if (args.length !== def.arguments.length) {
				throw new TypeError("expecting " + toString(fn) + " to be called with " + def.arguments.length + " arguments, got " + args.length);
			}
			def.arguments.forEach(function (argDef, i) {
				matchDefinitions(args[i], argDef, 'arguments[' + i + ']');
			});
			var returnValue = fn.apply(this, args);
			if ("return" in def) {
				matchDefinitions(returnValue, def.return, 'return value');
			}
			return returnValue;
		};
		Object.setPrototypeOf(proxyFn, model.prototype);
		proxyFn.constructor = FunctionModel;
		return proxyFn;
	};

	model.definition = {	arguments: Array.prototype.map.call(arguments, parseDefinition) };
	model.prototype = Object.create(Function.prototype);
	model.prototype.constructor = model;
	Object.setPrototypeOf(model, FunctionModel.prototype);
	return model;
};

Model.Function.prototype = Object.create(Model.prototype);
Model.Function.prototype.isValidModelFor = isFunction; // nothing else to check, validation is done on function call
Model.Function.prototype.validate = function (f) {
	if(!isFunction(f)){
		throw new TypeError("expecting a function, got: " + toString(f));
	}
};

Model.Function.prototype.toString = function(ndeep){
	var out = 'Model.Function('+this.definition.arguments.map(function(argDef){ return toString(argDef, ndeep); }).join(",") +')';
	if("return" in this.definition) {
		out += ".return(" + toString(this.definition.return) + ")";
	}
	return out;
};

Model.Function.prototype.return = function(def){
	this.definition.return = parseDefinition(def);
	return this;
};

Model.Function.prototype.defaults = function(){
	this.definition.defaults = cloneArray(arguments);
	return this;
};
return Model;
}));
},{}],2:[function(require,module,exports){
var Model = require('../../dist/object-model.umd');
testSuite(Model);
},{"../../dist/object-model.umd":1}]},{},[2]);
