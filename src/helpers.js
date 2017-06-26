import Model from "./model"

export const getProto        = Object.getPrototypeOf
export const is              = (Constructor, obj) => obj instanceof Constructor
export const isString        = s => typeof s === "string"
export const isFunction      = f => typeof f === "function"
export const isObject        = o => typeof o === "object"
export const isArray         = a => Array.isArray(a)
export const isPlainObject   = o => o && isObject(o) && getProto(o) === Object.prototype
export const isModelInstance = i => i && is(Model, getProto(i).constructor)
export const bettertypeof    = x => ({}).toString.call(x).match(/\s([a-zA-Z]+)/)[1]

export const proxify      = (val, traps) => new Proxy(val, traps)
export const proxifyFn    = (fn, apply) => proxify(fn, {apply})
export const proxifyModel = (val, model, traps) => proxify(val, Object.assign({
	getPrototypeOf: () => model.prototype
}, traps))

export function merge(target, src = {}, deep, includingProto) {
	for (let key in src) {
		if (includingProto || src.hasOwnProperty(key)) {
			if (deep && isPlainObject(src[key])) {
				const o = {}
				merge(o, target[key], deep)
				merge(o, src[key], deep)
				target[key] = o
			} else {
				target[key] = src[key]
			}
		}
	}
}

export function define(obj, key, value, enumerable = false) {
	Object.defineProperty(obj, key, {value, enumerable, writable: true, configurable: true})
}

export function setConstructor(model, constructor) {
	Object.setPrototypeOf(model, constructor.prototype)
	define(model, "constructor", constructor)
}

export function extend(child, parent, props) {
	child.prototype = Object.assign(Object.create(parent.prototype, {
		constructor: {
			value: child,
			writable: true,
			configurable: true
		}
	}), props)
	Object.setPrototypeOf(child, parent)
}

export function format(obj, stack = []) {
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
		const props  = Object.keys(obj),
		      indent = '\t'.repeat(stack.length)
		return `{${props.map(
			key => `\n${indent + key}: ${format(obj[key], stack.slice())}`
		).join(',')} ${props.length ? `\n${indent.slice(1)}` : ''}}`
	}

	return String(obj)
}

export const _constructor = "_constructor"
export const _validate = "_validate"