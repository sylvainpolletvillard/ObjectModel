function isFunction(o){
	return typeof o === "function"
}
function isObject(o){
    return typeof o === "object"
}

function isPlainObject(o){
	return o && isObject(o) && O.getPrototypeOf(o) === O.prototype
}

function bettertypeof(obj){
	return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1]
}

function deepAssign(target, src) {
	O.keys(src || {}).forEach(key => {
		if(isPlainObject(src[key])){
			const o = {}
			deepAssign(o, target[key])
			deepAssign(o, src[key])
			target[key] = o
		} else {
			target[key] = src[key]
		}
	})
}

function define(obj, key, value, enumerable) {
	defineProperty(obj, key, { value, enumerable, writable: true, configurable: true })
}

function setConstructor(model, constructor){
	O.setPrototypeOf(model, constructor[PROTO])
	define(model, CONSTRUCTOR, constructor)
}

function setConstructorProto(constructor, proto){
	constructor[PROTO] = O.create(proto)
	constructor[PROTO][CONSTRUCTOR] = constructor
}

function toString(obj, stack = []){
	if(stack.length > 15 || stack.includes(obj)) return '...'
	if(obj == null) return String(obj)
	if(typeof obj == "string") return `"${obj}"`
	if(obj instanceof Model) return obj.toString(stack);
	stack = [obj].concat(stack)
	if(isFunction(obj)) return obj.name || obj.toString(stack)
	if(Array.isArray(obj)) return `[${obj.map(item => toString(item, stack)).join(', ')}]`
	if(obj && isObject(obj)) {
		const props = O.keys(obj),
			  indent = '\t'.repeat(stack.length)
		return `{${props.map(
			key => `\n${indent+key}: ${toString(obj[key], stack)}`
		).join(',')} ${props.length ? `\n${indent}` : ''}}`
	}
	return String(obj)
}