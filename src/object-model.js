import {
	bettertypeof, define, extend, getProto, has, is, isFunction, isObject, isPlainObject,
	merge, proxifyFn, setConstructor
} from "./helpers.js"

export const
	_validate = Symbol(),
	_original = Symbol(), // used to bypass proxy

	MODE_CAST = Symbol(), // used to skip validation at instanciation for perf

	initModel = (model, def) => {
		model.definition = def
		model.assertions = [...model.assertions]
		define(model, "errors", [])
		delete model.name;
	},

	extendModel = (child, parent, newProps) => {
		extend(child, parent, newProps)
		child.assertions.push(...parent.assertions)
		return child
	},

	stackError = (errors, expected, received, path, message) => {
		errors.push({ expected, received, path, message })
	},

	unstackErrors = (model, errorCollector = model.errorCollector) => {
		let nbErrors = model.errors.length
		if (nbErrors > 0) {
			let errors = model.errors.map(err => {
				if (!err.message) {
					let def = [].concat(err.expected)
					err.message = "expecting " + (err.path ? err.path + " to be " : "") + def.map(d => format(d)).join(" or ")
						+ ", got " + (err.received != null ? bettertypeof(err.received) + " " : "") + format(err.received)
				}
				return err
			})
			model.errors = []
			errorCollector.call(model, errors) // throw all errors collected
		}
		return nbErrors
	},

	isModelInstance = i => i && is(Model, getProto(i).constructor),

	parseDefinition = (def) => {
		if (isPlainObject(def)) {
			Object.keys(def).map(key => { def[key] = parseDefinition(def[key]) })
		}
		else if (!Array.isArray(def)) return [def]
		else if (def.length === 1) return [...def, undefined, null]

		return def
	},

	formatDefinition = (def, stack) => {
		let parts = parseDefinition(def).map(d => format(d, stack));
		return parts.length > 1 ? `(${parts.join(" or ")})` : parts[0]
	},

	extendDefinition = (def, newParts = []) => {
		newParts = [].concat(newParts)
		if (newParts.length > 0) {
			def = newParts
				.reduce((def, ext) => def.concat(ext), [].concat(def)) // clone to lose ref
				.filter((value, index, self) => self.indexOf(value) === index) // remove duplicates
		}

		return def
	},

	checkDefinition = (obj, def, path, errors, stack, shouldCast) => {
		let indexFound = stack.indexOf(def)
		if (indexFound !== -1 && stack.indexOf(def, indexFound + 1) !== -1)
			return obj //if found twice in call stack, cycle detected, skip validation

		if (is(Model, def)) {
			if (shouldCast) obj = cast(obj, def)
			def[_validate](obj, path, errors, stack.concat(def))
		}
		else if (isPlainObject(def)) {
			Object.keys(def).map(key => {
				let val = obj ? obj[key] : undefined;
				checkDefinition(val, def[key], formatPath(path, key), errors, stack, shouldCast)
			})
		}
		else {
			let pdef = parseDefinition(def)
			if (pdef.some(part => checkDefinitionPart(obj, part, path, stack))) {
				if (shouldCast) obj = cast(obj, def)
				return obj
			}

			stackError(errors, def, obj, path)
		}

		return obj
	},

	checkDefinitionPart = (obj, def, path, stack, shouldCast) => {
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
		if (stack.length > 15 || stack.includes(obj)) return '...'
		if (obj === null || obj === undefined) return String(obj)
		if (typeof obj === "string") return `"${obj}"`
		if (is(Model, obj)) return obj.toString(stack)

		stack.unshift(obj)

		if (isFunction(obj)) return obj.name || obj.toString()
		if (is(Map, obj) || is(Set, obj)) return format([...obj])
		if (Array.isArray(obj)) return `[${obj.map(item => format(item, stack)).join(', ')}]`
		if (obj.toString !== Object.prototype.toString) return obj.toString()
		if (obj && isObject(obj)) {
			let props = Object.keys(obj),
				indent = '\t'.repeat(stack.length)
			return `{${props.map(
				key => `\n${indent + key}: ${format(obj[key], [...stack])}`
			).join(',')} ${props.length ? `\n${indent.slice(1)}` : ''}}`
		}

		return String(obj)
	},

	formatPath = (path, key) => path ? path + '.' + key : key,

	controlMutation = (model, def, path, o, key, privateAccess, applyMutation) => {
		let newPath = formatPath(path, key),
			isPrivate = model.conventionForPrivate(key),
			isConstant = model.conventionForConstant(key),
			isOwnProperty = has(o, key),
			initialPropDescriptor = isOwnProperty && Object.getOwnPropertyDescriptor(o, key)

		if (key in def && ((isPrivate && !privateAccess) || (isConstant && o[key] !== undefined)))
			cannot(`modify ${isPrivate ? "private" : "constant"} property ${key}`, model)

		let isInDefinition = has(def, key);
		if (isInDefinition || !model.sealed) {
			applyMutation(newPath)
			if (isInDefinition) checkDefinition(o[key], def[key], newPath, model.errors, [])
			checkAssertions(o, model, newPath)
		}
		else rejectUndeclaredProp(newPath, o[key], model.errors)

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

	rejectUndeclaredProp = (path, received, errors) => {
		errors.push({
			path,
			received,
			message: `property ${path} is not declared in the sealed model definition`
		})
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
			// automatically cast to suitable model when explicit (duck typing)
			return new suitableModels[0](obj, MODE_CAST)
		}

		if (suitableModels.length > 1)
			console.warn(`Ambiguous model for value ${format(obj)}, could be ${suitableModels.join(" or ")}`)

		return obj
	},

	checkUndeclaredProps = (obj, def, errors, path) => {
		Object.keys(obj).map(key => {
			let val = obj[key],
				subpath = formatPath(path, key)
			if (!has(def, key)) rejectUndeclaredProp(subpath, val, errors)
			else if (isPlainObject(val)) checkUndeclaredProps(val, def[key], errors, subpath)
		})
	},

	getProxy = (model, obj, def, path, privateAccess) => {
		if (!isPlainObject(def)) return cast(obj, def)

		const grantPrivateAccess = f => proxifyFn(f, (fn, ctx, args) => {
			privateAccess = true;
			let result = Reflect.apply(fn, ctx, args);
			privateAccess = false;
			return result
		})

		return new Proxy(obj, {

			getPrototypeOf: () => path ? Object.prototype : getProto(obj),

			get(o, key) {
				if (key === _original) return o

				if (typeof key !== "string") return Reflect.get(o, key)

				let newPath = formatPath(path, key),
					defPart = def[key];

				if (!privateAccess && key in def && model.conventionForPrivate(key)) {
					cannot(`access to private property ${newPath}`, model)
					unstackErrors(model)
					return
				}

				if (o[key] && has(o, key) && !isPlainObject(defPart) && !isModelInstance(o[key])) {
					o[key] = cast(o[key], defPart) // cast nested models
				}

				if (isFunction(o[key]) && key !== "constructor") {
					return grantPrivateAccess(o[key])
				}

				if (isPlainObject(defPart) && !o[key]) {
					o[key] = {} // null-safe traversal
				}

				return getProxy(model, o[key], defPart, newPath, privateAccess)
			},

			set(o, key, val) {
				return controlMutation(model, def, path, o, key, privateAccess,
					newPath => Reflect.set(o, key, getProxy(model, val, def[key], newPath))
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
				let descriptor;
				if (!model.conventionForPrivate(key)) {
					descriptor = Object.getOwnPropertyDescriptor(def, key);
					if (descriptor !== undefined) descriptor.value = o[key];
				}

				return descriptor
			}
		})
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
		return formatDefinition(this.definition, stack)
	},

	as(name) {
		define(this, "name", name);
		return this
	},

	defaultTo(val) {
		this.default = val
		return this
	},

	[_validate](obj, path, errors, stack) {
		checkDefinition(obj, this.definition, path, errors, stack)
		checkAssertions(obj, this, path, errors)
	},

	validate(obj, errorCollector) {
		this[_validate](obj, null, this.errors, [])
		return !unstackErrors(this, errorCollector)
	},

	test(obj) {
		let model = this;
		while (!has(model, "errorCollector")) {
			model = getProto(model)
		}

		let initialErrorCollector = model.errorCollector,
			failed;

		model.errorCollector = () => {
			failed = true
		}

		new this(obj) // may trigger this.errorCollector

		model.errorCollector = initialErrorCollector
		return !failed
	},

	errorCollector(errors) {
		let e = new TypeError(errors.map(e => e.message).join('\n'))
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
	let model = function (val = model.default) {
		return model.validate(val) ? val : undefined
	}

	setConstructor(model, BasicModel)
	initModel(model, def)
	return model
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


export function ObjectModel(def, params) {
	let model = function (obj = model.default, mode) {
		if (!is(model, this)) return new model(obj)
		if (is(model, obj)) return obj

		if (!is(Object, obj) && obj !== undefined) {
			stackError(model.errors, Object, obj);
		}

		if (model.parentClass) merge(obj, new model.parentClass(obj))
		merge(this, obj)

		if (mode !== MODE_CAST) {
			model[_validate](this, null, model.errors, [], true)
			unstackErrors(model)
		}

		return getProxy(model, this, model.definition)
	}

	Object.assign(model, params)
	extend(model, Object)
	setConstructor(model, ObjectModel)
	initModel(model, def)
	return model
}

extend(ObjectModel, Model, {
	sealed: false,

	defaults(p) {
		Object.assign(this.prototype, p)
		return this
	},

	toString(stack) {
		return format(this.definition, stack)
	},

	extend(...newParts) {
		let definition = Object.assign({}, this.definition),
			proto = Object.assign({}, this.prototype),
			newAssertions = []

		for (let part of newParts) {
			if (is(Model, part)) {
				merge(definition, part.definition)
				newAssertions.push(...part.assertions)
			}
			if (isFunction(part)) merge(proto, part.prototype)
			if (isObject(part)) merge(definition, part)
		}

		let submodel = extendModel(new ObjectModel(definition), this, proto)
		submodel.assertions = [...this.assertions, ...newAssertions]

		if (getProto(this) !== ObjectModel.prototype) { // extended class
			submodel.parentClass = this;
		}

		return submodel
	},

	[_validate](obj, path, errors, stack, shouldCast) {
		if (isObject(obj)) {
			let def = this.definition
			checkDefinition(obj[_original] || obj, def, path, errors, stack, shouldCast)
			if (this.sealed) checkUndeclaredProps(obj, def, errors)
		}
		else stackError(errors, this, obj, path)

		checkAssertions(obj, this, path, errors)
	}
})