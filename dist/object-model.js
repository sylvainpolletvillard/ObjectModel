;(function(global){
function isFunction(o){
	return typeof o === "function";
}
function isObject(o){
    return typeof o === "object";
}

var isArray = Array.isArray || function(a){
	return a instanceof Array
};

function toString(obj, ndeep){
	if(ndeep === undefined){ ndeep = 0; }
	if(ndeep > 15){ return '...'; }
	if(obj == null){ return String(obj); }
	if(typeof obj == "string"){ return '"'+obj+'"'; }
	if(isFunction(obj)){ return obj.name || obj.toString(ndeep); }
	if(isArray(obj)){
		return '[' + obj.map(function(item) {
				return toString(item, ndeep);
			}).join(', ') + ']';
	}
	if(obj && isObject(obj)){
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

function setProto(model, proto){
    model.prototype = proto;
    model.prototype.constructor = model;
}

function setConstructor(model, constructor){
	Object.setPrototypeOf(model, constructor.prototype);
	Object.defineProperty(model, "constructor", {enumerable: false, writable: true, value: constructor});
}
function Model(def){
	if(!isLeaf(def)) return Model.Object(def);

	var model = function(obj) {
		model.validate(obj, []);
		return obj;
	};

	setConstructor(model, Model);
	model.definition = def;
	model.assertions = [];
	return model;
}

setProto(Model, Object.create(Function.prototype));

Model.prototype.toString = function(ndeep){
	return toString(this.definition, ndeep);
};

Model.prototype.validate = function(obj, stack){
	checkDefinition(obj, this.definition, undefined, stack);
	matchAssertions(obj, this.assertions);
};

Model.prototype.extend = function(){
	var submodel = new this.constructor(mergeDefinitions(this.definition, arguments));
	setProto(submodel, Object.create(this.prototype));
	ensureProto(submodel.prototype, this.prototype);
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

function isLeaf(def){
	return bettertypeof(def) != "Object";
}

function mergeDefinitions(base, exts){
	if(!exts.length) return base;
	if(isLeaf(base)){
		return cloneArray(exts)
			.reduce(function(def, ext){ return def.concat(parseDefinition(ext)); }, parseDefinition(base))
			.filter(function(value, index, self) { // remove duplicates
				return self.indexOf(value) === index;
			});
	} else {
		return cloneArray(exts)
			.reduce(function(def, ext){ return merge(ext || {}, def); }, base);
	}
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
		var l = def.length;
		if(!l){ return; }
		for(var i= 0; i<l; i++){
			if(checkDefinitionPart(obj, def[i], stack)){ return; }
		}
		throw new TypeError("expecting " + (path ? path + " to be " : "") + def.map(toString).join(" or ")
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
		try { def.validate(obj, stack.concat(def)); return true; }
		catch(e){ return false; }
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
		model.validate(proxy, []);
		ensureProto(proxy, model.prototype);
		return proxy;
	};

	setConstructor(model, ObjectModel);
	model.definition = def;
	model.assertions = [];
	return model;
};

Model.Object.prototype = Object.create(Model.prototype);
Model.Object.prototype.constructor = Model;

Model.Object.prototype.defaults = function(p){
	merge(this.prototype, p);
	return this;
};

function getProxy(model, obj, defNode, path) {
	if(Model.instanceOf(defNode, Model.Function)){
		return defNode(obj);
	} else if(isLeaf(defNode)){
		return obj;
	} else {
		var wrapper = obj instanceof Object ? obj : Object.create(Object.prototype);
		var proxy = Object.create(Object.getPrototypeOf(wrapper));
		Object.keys(defNode).forEach(function(key) {
			var newPath = (path ? path + '.' + key : key);
			var isWritable = (key.toUpperCase() != key);
			Object.defineProperty(proxy, key, {
				get: function () {
					return getProxy(model, wrapper[key], defNode[key], newPath);
				},
				set: function (val) {
					if(!isWritable && wrapper[key] !== undefined){
						throw new TypeError("cannot redefine constant " + key);
					}
					var newProxy = getProxy(model, val, defNode[key], newPath);
					checkDefinition(newProxy, defNode[key], newPath, []);
					var oldValue = wrapper[key];
					wrapper[key] = newProxy;
					try { matchAssertions(obj, model.assertions); }
					catch(e){ wrapper[key] = oldValue; throw e; }
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

		var array = cloneArray(arguments),
			proxy = Object.create(Array.prototype);
		model.validate(array);
		proxifyKeys(proxy, array, Object.keys(array), model);
		Object.defineProperty(proxy, "length", { get: function() { return array.length; } });

		ARRAY_MUTATOR_METHODS.forEach(function (method) {
			Object.defineProperty(proxy, method, { configurable: true, value: function() {
				var testArray = array.slice();
				Array.prototype[method].apply(testArray, arguments);
				model.validate(testArray);
				var newKeys = Object.keys(testArray).filter(function(key){ return !(key in proxy) });
				proxifyKeys(proxy, array, newKeys, model);
				return Array.prototype[method].apply(array, arguments);
			}});
		});

		setConstructor(proxy, model);
		return proxy;
	};

	setProto(model, Object.create(Array.prototype));
	setConstructor(model, ArrayModel);
	model.definition = def;
	model.assertions = [];
	return model;
};

Model.Array.prototype = Object.create(Model.prototype);
Model.Array.prototype.constructor = Model;

Model.Array.prototype.validate = function(arr){
	if(!isArray(arr)){
		throw new TypeError("expecting an array, got: " + toString(arr));
	}
	for(var i=0, l=arr.length; i<l; i++){
		checkDefinition(arr[i], this.definition, 'Array['+i+']', []);
	}
	matchAssertions(arr, this.assertions);
};

Model.Array.prototype.toString = function(ndeep){
	return 'Model.Array(' + toString(this.definition, ndeep) + ')';
};

function proxifyKeys(proxy, array, indexes, model){
	indexes.forEach(function(index){
		Object.defineProperty(proxy, index, {
			get: function () {
				return array[index];
			},
			set: function (val) {
				checkDefinition(val, model.definition, 'Array['+index+']', []);
				var testArray = array.slice();
				testArray[index] = val;
				matchAssertions(testArray, model.assertions);
				array[index] = val;
			}
		});
	});
}
Model.Function = function FunctionModel(){

	var model = function(fn) {

		var def = model.definition;
		var proxyFn = function () {
			var args = merge(cloneArray(arguments), def.defaults);
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

	setProto(model, Object.create(Function.prototype));
	setConstructor(model, FunctionModel);
	model.definition = { arguments: cloneArray(arguments) };
	model.assertions = [];
	return model;
};

setProto(Model.Function, Object.create(Model.prototype));
Model.Function.constructor.prototype = Model;

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
	this.definition.return = def;
	return this;
};

Model.Function.prototype.defaults = function(){
	this.definition.defaults = cloneArray(arguments);
	return this;
};

global.Model = Model;
})(this);