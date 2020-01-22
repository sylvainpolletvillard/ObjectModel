export const
	bettertypeof = x => Object.prototype.toString.call(x).match(/\s([a-zA-Z]+)/)[1],
	getProto = Object.getPrototypeOf,
	setProto = Object.setPrototypeOf,

	has = (o, prop) => Object.prototype.hasOwnProperty.call(o, prop),
	is = (Constructor, obj) => obj instanceof Constructor,
	isFunction = f => typeof f === "function",
	isObject = o => o && typeof o === "object",
	isPlainObject = o => isObject(o) && getProto(o) === Object.prototype,
	isIterable = x => x && isFunction(x[Symbol.iterator]),

	proxify = (val, traps) => new Proxy(val, traps),

	merge = (target, src = {}) => {
		for (let key in src) {
			if (isPlainObject(src[key])) {
				const o = {}
				merge(o, target[key])
				merge(o, src[key])
				target[key] = o
			} else {
				target[key] = src[key]
			}
		}
		return target
	},

	define = (obj, key, value, enumerable = false) => {
		Object.defineProperty(obj, key, { value, enumerable, writable: true, configurable: true })
	},

	extend = (child, parent, props) => {
		child.prototype = Object.assign(Object.create(parent.prototype, {
			constructor: {
				value: child,
				writable: true,
				configurable: true
			}
		}), props)
		setProto(child, parent)
	}