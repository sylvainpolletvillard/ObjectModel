(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (globals, factory) {
 if (typeof define === 'function' && define.amd) define(factory); // AMD
 else if (typeof exports === 'object') module.exports = factory(); // Node
 else globals['Model'] = factory(); // globals
}(this, function () {
function isFunction(o){
	return typeof o === "function";
}

function objToString(obj, ndeep){
	if(ndeep === undefined){ ndeep = 1; }
	if(obj == null){ return String(obj); }
	if(typeof obj == "string"){ return '"'+obj+'"'; }
	if(typeof obj == "function"){ return obj.name || obj.toString(ndeep); }
	if(Array.isArray(obj)){
		return '[' + obj.map(function(item) {
				return objToString(item, ndeep);
			}).join(', ') + ']';
	}
	if(obj && typeof obj == "object"){
		var indent = (new Array(ndeep)).join('\t');
		return '{' + Object.keys(obj).map(function(key){
				return '\n\t' + indent + key + ': ' + objToString(obj[key], ndeep+1);
			}).join(',') + '\n' + indent + '}';
	}
	return String(obj)
}

function bettertypeof(obj){
	return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1];
}

function arrayCopy(arr){
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
function matchDefinition(obj, _def, path){
	var def = _def;
	if(!Array.isArray(_def)) {
		def = [_def];
	} else if(def.length < 2){
		def = _def.concat(undefined);
	}

	if (!def.some(function(part){ return matchDefinitionPart(obj, part) })){
		throw new TypeError(
			"expecting " + path + " to be " + def.map(objToString).join(" or ")
			+ ", got " + (obj != null ? bettertypeof(obj) + " " : "") + objToString(obj)
		);
	}
}

function matchDefinitionPart(obj, def){
	if(obj == null){
		return obj === def;
	}
	if(isFunction(def) && isFunction(def.isValidModelFor)){
		return def.isValidModelFor(obj);
	}
	if(def instanceof RegExp){
		return def.test(obj);
	}
	return obj === def
		|| (isFunction(def) && obj instanceof def)
		|| obj.constructor === def;
}
function Model(def, proto){

	//if(!isLeaf(def)) return Model.Object(def, proto); //TODO

	var Constructor = function(obj) {
		if(!(this instanceof Constructor)){
			return new Constructor(obj);
		}
		merge(this, obj, true);
		var proxy = getProxy(this, def);
		validateModel(proxy, def);
		return proxy;
	};

	Constructor.extend = function(ext){
		return new Model(merge(ext || {}, def), Constructor.prototype);
	};
	Constructor.defaults = function(p){
		Constructor.prototype = p;
		return this;
	};

	Constructor.toString = objToString.bind(this, def);
	Constructor.prototype = Object.create(proto || Object.prototype);
	Constructor.prototype.constructor = Constructor;
	Object.setPrototypeOf(Constructor, Model.prototype);
	return Constructor;
}
Model.prototype = Object.create(Function.prototype);
Model.prototype.isValidModelFor = function isValidModelFor(obj){
  try {
    new this(obj);
    return true;
  }
  catch(e){
    if(e instanceof TypeError){
      return false;
    }
    throw e;
  }
};

function isLeaf(def){
  return typeof def != "object" || Array.isArray(def) || def instanceof RegExp;
}

function getProxy(obj, def, path) {
  if(def instanceof Model.Function){
    return def(obj);
  } else if(isLeaf(def)){
    matchDefinition(obj, def, path);
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
            validateModel(newProxy, def[key], newPath);
          }
          wrapper[key] = newProxy;
        },
        enumerable: (key[0] !== "_")
      });
    });
    return proxy;
  }
}

function validateModel(obj, def, path){
  if(isLeaf(def)){
    matchDefinition(obj, def, path);
  } else {
    Object.keys(def).forEach(function(key) {
      var newPath = (path ? [path,key].join('.') : key);
      validateModel(obj instanceof Object ? obj[key] : undefined, def[key], newPath);
    });
  }
}
var ARRAY_MUTATOR_METHODS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];

Model.Array = function ArrayModel(itemDef){

	var def = {
		item: itemDef,
		min: 0,
		max: Infinity
	};

	var Constructor = function() {
		var array = arrayCopy(arguments);
		if(!(this instanceof Constructor)){
			return new (Function.prototype.bind.apply(Constructor, [null].concat(array)));
		}

		validateArrayModel(array, def);
		return getArrayProxy(this, array, def);
	};

	Constructor.min = function(val){ def.min = val; return this };
	Constructor.max = function(val){ def.max = val; return this };
	Constructor.extend = function(itemDef){
		var Ext = new ArrayModel([].concat(def.item).concat(itemDef || []));
		Ext.prototype = Object.create(Constructor.prototype);
		Ext.prototype.constructor = Ext;
		return Ext;
	};
	Constructor.isValidModelFor = function(arr){
		try {
			this.apply(null, arr);
			return true;
		}
		catch(e){
			if(e instanceof TypeError){
				return false;
			}
			throw e;
		}
	};
	Constructor.toString = function(ndeep){
		var out= 'ArrayModel('+objToString(itemDef, ndeep)+')';
		if(def.min < 0){
			out += '.min('+def.min+')';
		}
		if(def.max < Infinity){
			out += '.max('+def.max+')';
		}
		return out;
	};

	Constructor.prototype = Object.create(Array.prototype); /* inherits from native array */
	Constructor.prototype.constructor = Constructor;
	Object.setPrototypeOf(Constructor, ArrayModel.prototype);
	return Constructor;
};
Model.Array.prototype = Object.create(Model.prototype);

function getArrayProxy(proto, array, def){
	var proxy = Object.create(proto);

	ARRAY_MUTATOR_METHODS.forEach(function (method) {
		Object.defineProperty(proxy, method, { configurable: true, value: function() {
			var testArray = array.slice();
			Array.prototype[method].apply(testArray, arguments);
			validateArrayModel(testArray, def);
			var newKeys = Object.keys(testArray).filter(function(key){ return !(key in proxy) });
			proxifyKeys(proxy, array, newKeys, def.item);
			return Array.prototype[method].apply(array, arguments);
		}});
	});

	proxifyKeys(proxy, array, Object.keys(array), def.item);
	Object.defineProperty(proxy, "length", {
		enumerable: false,
		get: function(){ return array.length; }
	});
	return proxy;
}

function proxifyKeys(proxy, array, indexes, itemDef){
	indexes.forEach(function(index){
		Object.defineProperty(proxy, index, {
			get: function () {
				return array[index];
			},
			set: function (val) {
				matchDefinition(val, itemDef, 'Array['+index+']');
				array[index] = val;
			}
		});
	});
}

function validateArrayModel(obj, def, path){
	obj.forEach(function(o, i){
		matchDefinition(o, def.item, 'Array['+i+']');
	});
	if(obj.length < def.min || obj.length > def.max){
		throw new TypeError(
			"expecting "+(path || "Array")+" to have "
		+(def.min === def.max ? def.min : "between" + def.min + " and " + def.max)
		+" items, got "+obj.length
		);
	}
}
Model.Function = function FunctionModel(){

	var def = {
		args: arrayCopy(arguments)
	};

	var Constructor = function(fn) {
		if(!(this instanceof Constructor)) {
			return new Constructor(fn);
		}

		var proxyFn = function () {
			var args = merge(arrayCopy(arguments), def.defaults);
			if (args.length !== def.args.length) {
				throw new TypeError("expecting " + objToString(fn) + " to be called with " + def.args.length + " arguments, got " + args.length);
			}
			def.args.forEach(function (argDef, i) {
				matchDefinition(args[i], argDef, 'arguments[' + i + ']');
			});
			var returnValue = fn.apply(this, args);
			if ("return" in def) {
				matchDefinition(returnValue, def.return, 'return value');
			}
			return returnValue;
		};
		Object.setPrototypeOf(proxyFn, Constructor.prototype);
		return proxyFn;
	};

	Constructor.return = function(val){ def.return = val; return this; };
	Constructor.defaults = function(){ def.defaults = arrayCopy(arguments); return this };
	Constructor.isValidModelFor = isFunction;
	Constructor.toString = function(ndeep){
		var out = 'Model.Function('+def.args.map(function(argDef) { return objToString(argDef, ndeep); }).join(",") +')';
		if("return" in def) {
			out += ".return(" + objToString(def.return) + ")";
		}
		return out;
	};
	Constructor.prototype = Object.create(Function.prototype);
	Constructor.prototype.constructor = Constructor;
	Object.setPrototypeOf(Constructor, FunctionModel.prototype);
	return Constructor;
};

Model.Function.prototype = Object.create(Model.prototype);
return Model;
}));
},{}],2:[function(require,module,exports){
var Model = require('../../dist/object-model.umd');
testSuite(Model);
},{"../../dist/object-model.umd":1}]},{},[2]);
