import Model from "./model"

export const
	_constructor = "_constructor",
	_validate = "_validate",

	ObjectProto     = Object.prototype,
	bettertypeof    = x => ObjectProto.toString.call(x).match(/\s([a-zA-Z]+)/)[1],
	getProto        = Object.getPrototypeOf,

	has             = (o, prop) => o.hasOwnProperty(prop),
	is              = (Constructor, obj) => obj instanceof Constructor,
	isString        = s => typeof s === "string",
	isFunction      = f => typeof f === "function",
	isObject        = o => typeof o === "object",
	isArray         = a => Array.isArray(a),
	isPlainObject   = o => o && isObject(o) && getProto(o) === ObjectProto,
	isModelInstance = i => i && is(Model, getProto(i).constructor),

	proxify      = (val, traps) => new Proxy(val, traps),
	proxifyFn    = (fn, apply) => proxify(fn, {apply}),
	proxifyModel = (val, model, traps) => proxify(val, Object.assign({ getPrototypeOf: () => model.prototype }, traps)),

	cannot   = (msg, model) => { model.errors.push({message: "cannot " + msg}) },
	getPath  = (path, key) => path ? path + '.' + key : key,
	mapProps = (o, fn) => Object.keys(o).map(fn)


export let merge = (target, src = {}, deep) => {
	for (let key in src) {
		if (deep && isPlainObject(src[key])) {
			let o = {}
			merge(o, target[key], deep)
			merge(o, src[key], deep)
			target[key] = o
		} else {
			target[key] = src[key]
		}
	}
}

export let define = (obj, key, value, enumerable = false) => {
	Object.defineProperty(obj, key, {value, enumerable, writable: true, configurable: true})
}

export let setConstructor = (model, constructor) => {
	Object.setPrototypeOf(model, constructor.prototype)
	define(model, "constructor", constructor)
}

export let extend = (child, parent, props) => {
	child.prototype = Object.assign(Object.create(parent.prototype, {
		constructor: {
			value: child,
			writable: true,
			configurable: true
		}
	}), props)
	Object.setPrototypeOf(child, parent)
}

export let format = (obj, stack = []) => {
	if (stack.length > 15 || stack.includes(obj)) return '...'
	if (obj === null || obj === undefined) return String(obj)
	if (isString(obj)) return `"${obj}"`
	if (is(Model, obj)) return obj.toString(stack)

	stack.unshift(obj)

	if (isFunction(obj)) return obj.name || obj.toString(stack)
	if (is(Map, obj) || is(Set, obj)) return format([...obj])
	if (isArray(obj)) return `[${obj.map(item => format(item, stack)).join(', ')}]`
	if (obj.toString !== Object.prototype.toString) return obj.toString()
	if (obj && isObject(obj)) {
		let props  = Object.keys(obj),
		    indent = '\t'.repeat(stack.length)
		return `{${props.map(
			key => `\n${indent + key}: ${format(obj[key], stack.slice())}`
		).join(',')} ${props.length ? `\n${indent.slice(1)}` : ''}}`
	}

	return String(obj)
}