;(function(global){
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

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
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
	};

	return initModel(model, Model, Object.create(isFunction(def) ? def.prototype : null), def);
}

Model.prototype = Object.create(Function.prototype);

Model.prototype.toString = function(ndeep){
	return toString(this.definition, ndeep);
};

Model.prototype.validate = function(obj){
	checkModel(obj, this.definition);
	matchAssertions(obj, this.assertions);
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

function checkModel(obj, def, path){
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
	if (!def.some(function(part){ return checkDefinitionPart(obj, part) }) ){
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
Model.Object = function ObjectModel(def){

	var model = function(obj) {
		if(!(this instanceof model)){
			return new model(obj);
		}
		merge(this, obj, true);
		var proxy = getProxy(model, this, model.definition);
        model.validate(proxy);
		return proxy;
	};

	return initModel(model, ObjectModel, Object.create(Object.prototype), def);
};

Model.Object.prototype = Object.create(Model.prototype);

Model.Object.prototype.defaults = function(p){
	merge(this.prototype, p);
	return this;
};

function getProxy(model, obj, defNode, path) {
	if(defNode instanceof Model.Function){
		return defNode(obj);
	} else if(isLeaf(defNode)){
		checkDefinitions(obj, defNode, path);
		return obj;
	} else {
		var wrapper = obj instanceof Object ? obj : Object.create(null);
		var proxy = Object.create(Object.getPrototypeOf(wrapper));
		Object.keys(defNode).forEach(function(key) {
			var newPath = (path ? [path,key].join('.') : key);
			var isWritable = (key.toUpperCase() != key);
			Object.defineProperty(proxy, key, {
				get: function () {
					return getProxy(model, wrapper[key], defNode[key], newPath);
				},
				set: function (val) {
					if(!isWritable && wrapper[key] !== undefined){
						throw new TypeError("cannot redefine constant "+key);
					}
					var newProxy = getProxy(model, val, defNode[key], newPath);
					checkModel(newProxy, defNode[key], newPath);
                    matchAssertions(obj, model.assertions);
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
				proxifyKeys(proxy, array, newKeys, model);
				return Array.prototype[method].apply(array, arguments);
			}});
		});

		proxifyKeys(proxy, array, Object.keys(array), model);
		Object.defineProperty(proxy, "length", {
			enumerable: false,
			get: function(){ return array.length; }
		});
		return proxy;
	};

	return initModel(model, ArrayModel, Object.create(Array.prototype), def);
};

Model.Array.prototype = Object.create(Model.prototype);

Model.Array.prototype.validate = function(arr){
	if(!isArray(arr)){
		throw new TypeError("expecting an array, got: " + toString(arr));
	}
	for(var i=0, l=arr.length; i<l; i++){
		checkDefinitions(arr[i], this.definition, 'Array['+i+']');
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
				checkDefinitions(val, model.definition, 'Array['+index+']');
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
				checkDefinitions(args[i], argDef, 'arguments[' + i + ']');
			});
			matchAssertions(args, model.assertions);
			var returnValue = fn.apply(this, args);
			if ("return" in def) {
				checkDefinitions(returnValue, def.return, 'return value');
			}
			return returnValue;
		};
		Object.setPrototypeOf(proxyFn, model.prototype);
		proxyFn.constructor = FunctionModel;
		return proxyFn;
	};

	return initModel(model, FunctionModel, Object.create(Function.prototype), { arguments: cloneArray(arguments) });
};

Model.Function.prototype = Object.create(Model.prototype);
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