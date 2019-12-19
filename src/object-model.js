import {
	bettertypeof, define, extend, getProto, has, is, isFunction, isObject, isPlainObject,
	merge, proxify, setProto
} from "./helpers.js"

export const
	_check = Symbol(),
	_checked = Symbol(), // used to skip validation at instanciation for perf
	_original = Symbol(), // used to bypass proxy

	initModel = (def, constructor, parent, init, getTraps, useNew) => {
		let model = function (val = model.default, mode) {
			if (useNew && !is(model, this)) return new model(val)
			if (init) val = init(val, model, this)

			if (mode === _checked || check(model, val))
				return getTraps ? proxify(val, getTraps(model)) : val
		}

		if (parent) extend(model, parent)
		setProto(model, constructor.prototype)
		model.constructor = constructor
		model.definition = def
		model.assertions = [...model.assertions]
		define(model, "errors", [])
		delete model.name
		return model
	},

	initObjectModel = (obj, model, _this) => {
		if (is(model, obj)) return obj

		if (!isObject(obj) && !isFunction(obj) && obj !== undefined) {
			stackError(model.errors, Object, obj)
		}

		merge(_this, model.default)
		if (model.parentClass) merge(obj, new model.parentClass(obj))
		merge(_this, obj)
		return _this
	},

	extendModel = (child, parent, newProps) => {
		extend(child, parent, newProps)
		child.assertions.push(...parent.assertions)
		return child
	},

	stackError = (errors, expected, received, path, message) => {
		errors.push({ expected, received, path, message })
	},

	unstackErrors = (model, collector = model.errorCollector) => {
		let nbErrors = model.errors.length
		if (nbErrors > 0) {
			let errors = model.errors.map(err => {
				if (!err.message) {
					err.message = "expecting " + (err.path ? err.path + " to be " : "") + formatDefinition(err.expected)
						+ ", got " + (err.received != null ? bettertypeof(err.received) + " " : "") + format(err.received)
				}
				return err
			})

			model.errors.length = 0
			collector.call(model, errors) // throw all errors collected
		}
		return nbErrors
	},

	isModelInstance = i => i && getProto(i) && is(Model, getProto(i).constructor),

	parseDefinition = (def) => {
		if (isPlainObject(def)) {
			Object.keys(def).map(key => { def[key] = parseDefinition(def[key]) })
		}
		else if (!Array.isArray(def)) return [def]
		else if (def.length === 1) return [def[0], undefined, null]

		return def
	},

	formatDefinition = (def, stack) => {
		let parts = parseDefinition(def).map(d => format(d, stack))
		return parts.length > 1 ? parts.join(" or ") : parts[0]
	},

	formatAssertions = fns => fns.length ? `(${fns.map(f => f.name || f.description || f)})` : "",

	extendDefinition = (def, newParts = []) => {
		newParts = [].concat(newParts)
		if (newParts.length > 0) {
			def = newParts
				.reduce((def, ext) => def.concat(ext), [].concat(def)) // clone to lose ref
				.filter((value, index, self) => self.indexOf(value) === index) // remove duplicates
		}

		return def
	},

	check = (model, obj) => {
		model[_check](obj, null, model.errors, [], true);
		return !unstackErrors(model)
	},

	checkDefinition = (obj, def, path, errors, stack, shouldCast) => {
		let indexFound = stack.indexOf(def)
		if (indexFound !== -1 && stack.indexOf(def, indexFound + 1) !== -1)
			return obj // if found twice in call stack, cycle detected, skip validation

		if (Array.isArray(def) && def.length === 1 && obj != null) {
			def = def[0] // shorten validation path for optionals
		}

		if (is(Model, def)) {
			if (shouldCast) obj = cast(obj, def)
			def[_check](obj, path, errors, stack.concat(def))
		}
		else if (isPlainObject(def)) {
			Object.keys(def).map(key => {
				let val = obj ? obj[key] : undefined
				checkDefinition(val, def[key], formatPath(path, key), errors, stack, shouldCast)
			})
		}
		else {
			let pdef = parseDefinition(def)
			if (pdef.some(part => checkDefinitionPart(obj, part, path, stack))) {
				return shouldCast ? cast(obj, def) : obj
			}

			stackError(errors, def, obj, path)
		}

		return obj
	},

	checkDefinitionPart = (obj, def, path, stack, shouldCast) => {
		if (def === Any) return true
		if (obj == null) return obj === def
		if (isPlainObject(def) || is(Model, def)) { // object or model as part of union type
			let errors = []
			checkDefinition(obj, def, path, errors, stack, shouldCast)
			return !errors.length
		}
		if (is(RegExp, def)) return def.test(obj)
		if (def === Number || def === Date) return obj.constructor === def && !isNaN(obj)
		return obj === def
			|| (isFunction(def) && is(def, obj))
			|| obj.constructor === def
	},

	checkAssertions = (obj, model, path, errors = model.errors) => {
		for (let assertion of model.assertions) {
			let result
			try {
				result = assertion.call(model, obj)
			} catch (err) {
				result = err
			}
			if (result !== true) {
				let onFail = isFunction(assertion.description) ? assertion.description : (assertionResult, value) =>
					`assertion "${assertion.description}" returned ${format(assertionResult)} `
					+ `for ${path ? path + " =" : "value"} ${format(value)}`
				stackError(errors, assertion, obj, path, onFail.call(model, result, obj, path))
			}
		}
	},

	format = (obj, stack = []) => {
		if (stack.length > 15 || stack.includes(obj)) return "..."
		if (obj === null || obj === undefined) return String(obj)
		if (typeof obj === "string") return `"${obj}"`
		if (is(Model, obj)) return obj.toString(stack)

		stack.unshift(obj)

		if (isFunction(obj)) return obj.name || obj.toString()
		if (is(Map, obj) || is(Set, obj)) return format([...obj])
		if (Array.isArray(obj)) return `[${obj.map(item => format(item, stack)).join(", ")}]`
		if (obj.toString && obj.toString !== Object.prototype.toString) return obj.toString()
		if (isObject(obj)) {
			let props = Object.keys(obj),
				indent = "\t".repeat(stack.length)
			return `{${props.map(
				key => `\n${indent + key}: ${format(obj[key], [...stack])}`
			).join(", ")} ${props.length ? `\n${indent.slice(1)}` : ""}}`
		}

		return String(obj)
	},

	formatPath = (path, key) => path ? path + "." + key : key,

	controlMutation = (model, def, path, o, key, privateAccess, applyMutation) => {
		let newPath = formatPath(path, key),
			isPrivate = model.conventionForPrivate(key),
			isConstant = model.conventionForConstant(key),
			isOwnProperty = has(o, key),
			initialPropDescriptor = isOwnProperty && Object.getOwnPropertyDescriptor(o, key)

		if (key in def && ((isPrivate && !privateAccess) || (isConstant && o[key] !== undefined)))
			cannot(`modify ${isPrivate ? "private" : "constant"} property ${key}`, model)

		applyMutation(newPath)
		if (has(def, key)) checkDefinition(o[key], def[key], newPath, model.errors, [])
		checkAssertions(o, model, newPath)

		let nbErrors = model.errors.length
		if (nbErrors) {
			if (isOwnProperty) Object.defineProperty(o, key, initialPropDescriptor)
			else delete o[key] // back to the initial property defined in prototype chain

			unstackErrors(model)
		}

		return !nbErrors
	},

	cannot = (msg, model) => {
		model.errors.push({ message: "cannot " + msg })
	},

	cast = (obj, defNode = []) => {
		if (!obj || isPlainObject(defNode) || is(BasicModel, defNode) || isModelInstance(obj))
			return obj // no value or not leaf or already a model instance

		let def = parseDefinition(defNode),
			suitableModels = []

		for (let part of def) {
			if (is(Model, part) && !is(BasicModel, part) && part.test(obj))
				suitableModels.push(part)
		}

		if (suitableModels.length === 1) {
			// automatically cast to suitable model when explicit (autocasting)
			return new suitableModels[0](obj, _checked)
		}

		if (suitableModels.length > 1)
			console.warn(`Ambiguous model for value ${format(obj)}, could be ${suitableModels.join(" or ")}`)

		return obj
	},


	getProp = (val, model, def, path, privateAccess) => {
		if (!isPlainObject(def)) return cast(val, def)
		return proxify(val, getTraps(model, def, path, privateAccess))
	},

	getTraps = (model, def, path, privateAccess) => {
		const grantPrivateAccess = f => proxify(f, {
			apply(fn, ctx, args) {
				privateAccess = true
				let result = Reflect.apply(fn, ctx, args)
				privateAccess = false
				return result
			}
		})

		return {
			getPrototypeOf: obj => path ? Object.prototype : getProto(obj),

			get(o, key) {
				if (key === _original) return o

				if (typeof key !== "string") return Reflect.get(o, key)

				let newPath = formatPath(path, key),
					defPart = def[key]

				if (!privateAccess && key in def && model.conventionForPrivate(key)) {
					cannot(`access to private property ${newPath}`, model)
					unstackErrors(model)
					return
				}

				if (o[key] && has(o, key) && !isPlainObject(defPart) && !isModelInstance(o[key])) {
					o[key] = cast(o[key], defPart) // cast nested models
				}

				if (isFunction(o[key]) && key !== "constructor" && !privateAccess) {
					return grantPrivateAccess(o[key])
				}

				if (isPlainObject(defPart) && !o[key]) {
					o[key] = {} // null-safe traversal
				}

				return getProp(o[key], model, defPart, newPath, privateAccess)
			},

			set(o, key, val) {
				return controlMutation(model, def, path, o, key, privateAccess,
					newPath => Reflect.set(o, key, getProp(val, model, def[key], newPath))
				)
			},

			deleteProperty(o, key) {
				return controlMutation(model, def, path, o, key, privateAccess, () => Reflect.deleteProperty(o, key))
			},

			defineProperty(o, key, args) {
				return controlMutation(model, def, path, o, key, privateAccess, () => Reflect.defineProperty(o, key, args))
			},

			has(o, key) {
				return Reflect.has(o, key) && Reflect.has(def, key) && !model.conventionForPrivate(key)
			},

			ownKeys(o) {
				return Reflect.ownKeys(o).filter(key => Reflect.has(def, key) && !model.conventionForPrivate(key))
			},

			getOwnPropertyDescriptor(o, key) {
				let descriptor
				if (!model.conventionForPrivate(key)) {
					descriptor = Object.getOwnPropertyDescriptor(def, key)
					if (descriptor !== undefined) descriptor.value = o[key]
				}

				return descriptor
			}
		}
	}


export function Model(def, params) {
	return isPlainObject(def) ? new ObjectModel(def, params) : new BasicModel(def)
}

Object.assign(Model.prototype, {
	name: "Model",
	assertions: [],

	conventionForConstant: key => key.toUpperCase() === key,
	conventionForPrivate: key => key[0] === "_",

	toString(stack) {
		return has(this, "name") ? this.name : formatDefinition(this.definition, stack) + formatAssertions(this.assertions)
	},

	as(name) {
		define(this, "name", name)
		return this
	},

	defaultTo(val) {
		this.default = val
		return this
	},

	[_check](obj, path, errors, stack) {
		checkDefinition(obj, this.definition, path, errors, stack)
		checkAssertions(obj, this, path, errors)
	},

	test(obj, errorCollector) {
		let model = this
		while (!has(model, "errorCollector")) {
			model = getProto(model)
		}

		let initialErrorCollector = model.errorCollector,
			failed

		model.errorCollector = errors => {
			failed = true
			if (errorCollector) errorCollector.call(this, errors)
		}

		new this(obj) // may trigger errorCollector

		model.errorCollector = initialErrorCollector
		return !failed
	},

	errorCollector(errors) {
		let e = new TypeError(errors.map(e => e.message).join("\n"))
		e.stack = e.stack.replace(/\n.*object-model(.|\n)*object-model.*/, "") // blackbox objectmodel in stacktrace
		throw e
	},

	assert(assertion, description = format(assertion)) {
		define(assertion, "description", description)
		this.assertions = this.assertions.concat(assertion)
		return this
	}
})


export function BasicModel(def) {
	return initModel(def, BasicModel)
}

extend(BasicModel, Model, {
	extend(...newParts) {
		let child = extendModel(new BasicModel(extendDefinition(this.definition, newParts)), this)
		for (let part of newParts) {
			if (is(BasicModel, part)) child.assertions.push(...part.assertions)
		}

		return child
	}
})

export function ObjectModel(def) {
	return initModel(def, ObjectModel, Object, initObjectModel, model => getTraps(model, def), true)
}

extend(ObjectModel, Model, {
	defaultTo(obj) {
		let def = this.definition
		for (let key in obj) {
			if (has(def, key)) {
				obj[key] = checkDefinition(obj[key], def[key], key, this.errors, [], true)
			}
		}
		unstackErrors(this)
		this.default = obj;
		return this
	},

	toString(stack) {
		return format(this.definition, stack)
	},

	extend(...newParts) {
		let definition = { ...this.definition },
			proto = { ...this.prototype },
			defaults = { ...this.default },
			newAssertions = []

		for (let part of newParts) {
			if (is(Model, part)) {
				merge(definition, part.definition)
				merge(defaults, part.default)
				newAssertions.push(...part.assertions)
			}
			if (isFunction(part)) merge(proto, part.prototype)
			if (isObject(part)) merge(definition, part)
		}

		let submodel = extendModel(new ObjectModel(definition), this, proto).defaultTo(defaults)
		submodel.assertions = [...this.assertions, ...newAssertions]

		if (getProto(this) !== ObjectModel.prototype) { // extended class
			submodel.parentClass = this
		}

		return submodel
	},

	[_check](obj, path, errors, stack, shouldCast) {
		if (isObject(obj)) {
			let def = this.definition
			checkDefinition(obj[_original] || obj, def, path, errors, stack, shouldCast)
		}
		else stackError(errors, this, obj, path)

		checkAssertions(obj, this, path, errors)
	}
})

export const Any = proxify(BasicModel(), {
	apply(target, ctx, [def]) {
		return Object.assign(Object.create(Any), { definition: def })
	}
})
Any.definition = Any
Any.toString = () => "Any"

Any.remaining = function (def) { this.definition = def }
extend(Any.remaining, Any, {
	toString() { return "..." + formatDefinition(this.definition) }
})
Any[Symbol.iterator] = function* () { yield new Any.remaining(this.definition) }