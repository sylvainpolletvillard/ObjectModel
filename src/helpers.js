export const
	_constructor = "_constructor",
	_validate    = "_validate",

	ObjectProto  = Object.prototype,
	bettertypeof = x => ObjectProto.toString.call(x).match(/\s([a-zA-Z]+)/)[1],
	getProto     = Object.getPrototypeOf,

	has           = (o, prop) => o.hasOwnProperty(prop),
	is            = (Constructor, obj) => obj instanceof Constructor,
	isString      = s => typeof s === "string",
	isFunction    = f => typeof f === "function",
	isObject      = o => typeof o === "object",
	isArray       = a => Array.isArray(a),
	isPlainObject = o => o && isObject(o) && getProto(o) === ObjectProto,

	proxify      = (val, traps) => new Proxy(val, traps),
	proxifyFn    = (fn, apply) => proxify(fn, {apply}),
	proxifyModel = (val, model, traps) => proxify(val, Object.assign({getPrototypeOf: () => model.prototype}, traps)),

	getPath  = (path, key) => path ? path + '.' + key : key,
	mapProps = (o, fn) => Object.keys(o).map(fn),
	cannot   = (msg, model) => {
		model.errors.push({ message: "cannot " + msg })
	},

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