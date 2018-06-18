export const
	bettertypeof = x => Object.prototype.toString.call(x).match(/\s([a-zA-Z]+)/)[1],
	getProto     = x => Object.getPrototypeOf(x),

	has           = (o, prop) => o.hasOwnProperty(prop),
	is            = (Constructor, obj) => obj instanceof Constructor,
	isString      = s => typeof s === "string",
	isFunction    = f => typeof f === "function",
	isObject      = o => typeof o === "object",
	isArray       = a => Array.isArray(a),
	isPlainObject = o => o && isObject(o) && getProto(o) === Object.prototype,
	isPrivate     = (prop, model) => model.conventionForPrivate(prop),
	isConstant    = (prop, model) => model.conventionForConstant(prop),

	proxify      = (val, traps) => new Proxy(val, traps),
	proxifyFn    = (fn, apply) => proxify(fn, {apply}),
	proxifyModel = (val, model, traps) => proxify(val, Object.assign({getPrototypeOf: () => model.prototype}, traps)),

	mapProps = (o, fn) => Object.keys(o).map(fn),

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
		Object.setPrototypeOf(model, constructor.prototype)
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
		Object.setPrototypeOf(child, parent)
	}