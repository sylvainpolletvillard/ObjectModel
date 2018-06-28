var isProxySupported = typeof Proxy === "function";
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

function getProto(x){
	return Object.getPrototypeOf(x)
}

function is(Constructor, obj){
	return obj instanceof Constructor;
}

function has(o, prop){
	return o.hasOwnProperty(prop)
}

function isFunction(o){
	return typeof o === "function";
}

function isObject(o){
    return typeof o === "object";
}

function isPlainObject(o){
	return o && isObject(o) && getProto(o) === Object.prototype;
}

function bettertypeof(obj){
	return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1];
}

function cloneArray(arr){
	return Array.prototype.slice.call(arr);
}

function defaultTo(defaultVal, val){
	return val === undefined ? defaultVal : val;
}

function merge(target, src, deep, includingProto) {
	for(var key in (src || {})){
		if(includingProto || has(src, key)){
			if(deep && isPlainObject(src[key])){
				var o = {};
				merge(o, target[key], deep);
				merge(o, src[key], deep);
				target[key] = o;
			} else {
				target[key] = src[key]
			}
		}
	}
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