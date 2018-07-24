export const
	bettertypeof = x => Object.prototype.toString.call(x).match(/\s([a-zA-Z]+)/)[1],
	getProto     = x => Object.getPrototypeOf(x),
	setProto     = (x,p) => Object.setPrototypeOf(x,p),

	has           = (o, prop) => o.hasOwnProperty(prop),
	is            = (Constructor, obj) => obj instanceof Constructor,
	isFunction    = f => typeof f === "function",
	isObject      = o => typeof o === "object",
	isPlainObject = o => o && isObject(o) && getProto(o) === Object.prototype,

	proxifyFn    = (fn, apply) => new Proxy(fn, {apply}),
	proxifyModel = (val, model, traps) => new Proxy(val, Object.assign({getPrototypeOf: () => model.prototype}, traps)),

	merge = (target, src = {}, deep) => {
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
	},

	define = (obj, key, value, enumerable = false) => {
		Object.defineProperty(obj, key, {value, enumerable, writable: true, configurable: true})
	},

	setConstructor = (model, constructor) => {
		setProto(model, constructor.prototype)
		define(model, "constructor", constructor)
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