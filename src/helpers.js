const defineProperty = Object.defineProperty;

function is(Constructor, obj){
	return obj instanceof Constructor;
}

function isFunction(o){
	return typeof o === "function"
}

function isObject(o){
    return typeof o === "object"
}

function isPlainObject(o){
	return o && isObject(o) && Object.getPrototypeOf(o) === Object.prototype
}

function bettertypeof(obj){
	return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1]
}

function merge(target, src={}, deep, includingProto) {
	for(let key in src){
		if(includingProto || src.hasOwnProperty(key)){
			if(deep && isPlainObject(src[key])){
				const o = {};
				merge(o, target[key], deep);
				merge(o, src[key], deep);
				target[key] = o;
			} else {
				target[key] = src[key]
			}
		}
	}
}

function define(obj, key, value, enumerable) {
	defineProperty(obj, key, { value, enumerable, writable: true, configurable: true })
}

function setConstructor(model, constructor){
	Object.setPrototypeOf(model, constructor[PROTO])
	define(model, CONSTRUCTOR, constructor)
}

function setConstructorProto(constructor, proto){
	constructor[PROTO] = Object.create(proto)
	constructor[PROTO][CONSTRUCTOR] = constructor
}

function toString(obj, stack = []){
	if(stack.length > 15 || stack.includes(obj)) return '...'
	if(obj == null) return String(obj)
	if(typeof obj == "string") return `"${obj}"`
	if(is(Model, obj)) return obj.toString(stack)
	stack = [obj].concat(stack)
	if(isFunction(obj)) return obj.name || obj.toString(stack)
	if(is(Array, obj)) return `[${obj.map(item => toString(item, stack)).join(', ')}]`
	if(obj.toString !== Object.prototype.toString) return obj.toString();
	if(obj && isObject(obj)) {
		const props = Object.keys(obj),
			  indent = '\t'.repeat(stack.length)
		return `{${props.map(
			key => `\n${indent+key}: ${toString(obj[key], stack)}`
		).join(',')} ${props.length ? `\n${indent.slice(1)}` : ''}}`
	}
	return String(obj)
}