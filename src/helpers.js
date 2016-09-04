var isProxySupported = isFunction(this.Proxy);

// shim for Function.name for browsers that don't support it. IE, I'm looking at you.
if (!("name" in Function.prototype && "name" in (function x() {}))) {
	Object.defineProperty(Function.prototype, "name", {
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

var isArray = Array.isArray;

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
	Object.defineProperty(obj, key, {
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
	if(isArray(obj)){
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