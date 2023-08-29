// ObjectModel v4.4.5 - http://objectmodel.js.org
// MIT License - Sylvain Pollet-Villard
const
	ObjectProto = Object.prototype,
	bettertypeof = x => ObjectProto.toString.call(x).match(/\s([a-zA-Z]+)/)[1],
	getProto = Object.getPrototypeOf,
	setProto = Object.setPrototypeOf,

	has = (o, prop) => ObjectProto.hasOwnProperty.call(o, prop),
	is = (Constructor, obj) => obj instanceof Constructor,
	isFunction = f => typeof f === "function",
	isObject = o => o && typeof o === "object",
	isString = s => typeof s === "string",
	isPlainObject = o => isObject(o) && getProto(o) === ObjectProto,
	isIterable = x => x && isFunction(x[Symbol.iterator]),

	proxify = (val, traps) => new Proxy(val, traps),

	merge = (target, src = {}) => {
		for (let key in src) {
			if (isPlainObject(src[key])) {
				const o = {};
				merge(o, target[key]);
				merge(o, src[key]);
				target[key] = o;
			} else {
				target[key] = src[key];
			}
		}
		return target
	},

	define = (obj, key, value, enumerable = false) => {
		Object.defineProperty(obj, key, { value, enumerable, writable: true, configurable: true });
	},

	extend = (child, parent, props) => {
		child.prototype = Object.assign(Object.create(parent.prototype, {
			constructor: {
				value: child,
				writable: true,
				configurable: true
			}
		}), props);
		setProto(child, parent);
	};

const
	_check = Symbol(),
	_checked = Symbol(), // used to skip validation at instanciation for perf
	_original = Symbol(), // used to bypass proxy
	CHECK_ONCE = Symbol(),

	initModel = (def, constructor, parent, init, getTraps, useNew) => {
		const model = function (val = model.default, mode) {
			if (useNew && !is(model, this)) return new model(val)
			if (init) val = init(val, model, this);

			if (mode === _checked || check(model, val))
				return getTraps && mode !== CHECK_ONCE ? proxify(val, getTraps(model)) : val
		};

		if (parent) extend(model, parent);
		setProto(model, constructor.prototype);
		model.constructor = constructor;
		model.definition = def;
		model.assertions = [...model.assertions];
		define(model, "errors", []);
		delete model.name;
		return model
	},

	initObjectModel = (obj, model, _this) => {
		if (is(model, obj)) return obj

		if (!isObject(obj) && !isFunction(obj) && obj !== undefined) {
			// short circuit validation if not receiving an object as expected
			return obj
		}

		merge(_this, model.default);
		if (model.parentClass) merge(obj, new model.parentClass(obj));
		merge(_this, obj);
		return _this
	},

	extendModel = (child, parent, newProps) => {
		extend(child, parent, newProps);
		child.assertions.push(...parent.assertions);
		return child
	},

	stackError = (errors, expected, received, path, message) => {
		errors.push({ expected, received, path, message });
	},

	unstackErrors = (model, collector = model.errorCollector) => {
		const nbErrors = model.errors.length;
		if (nbErrors > 0) {
			const errors = model.errors.map(err => {
				if (!err.message) {
					err.message = "expecting " + (err.path ? err.path + " to be " : "") + formatDefinition(err.expected)
						+ ", got " + (err.received != null ? bettertypeof(err.received) + " " : "") + format$1(err.received);
				}
				err.model = model;
				return err
			});

			model.errors.length = 0;
			collector.call(model, errors); // throw all errors collected
		}
		return nbErrors
	},

	isModelInstance = i => i && getProto(i) && is(Model, getProto(i).constructor),

	parseDefinition = (def) => {
		if (isPlainObject(def)) {
			def = {};
			for (let key in def) { def[key] = parseDefinition(def[key]); }
		}
		if (!Array.isArray(def)) return [def]
		else if (def.length === 1) return [def[0], undefined, null]

		return def
	},

	formatDefinition = (def, stack) => {
		const parts = parseDefinition(def).map(d => format$1(d, stack));
		return parts.length > 1 ? parts.join(" or ") : parts[0]
	},

	formatAssertions = fns => fns.length ? `(${fns.map(f => f.name || f.description || f)})` : "",

	extendDefinition = (def, newParts = []) => {
		if (newParts.length > 0) {
			def = [].concat(def, ...[].concat(newParts))// clone to lose ref
				.filter((value, index, self) => self.indexOf(value) === index); // remove duplicates
		}

		return def
	},

	check = (model, obj) => {
		model[_check](obj, null, model.errors, [], true);
		return !unstackErrors(model)
	},

	checkDefinition = (obj, def, path, errors, stack, shouldCast) => {
		const indexFound = stack.indexOf(def);
		if (indexFound !== -1 && stack.indexOf(def, indexFound + 1) !== -1)
			return obj // if found twice in call stack, cycle detected, skip validation

		if (Array.isArray(def) && def.length === 1 && obj != null) {
			def = def[0]; // shorten validation path for optionals
		}

		if (is(Model, def)) {
			if (shouldCast) obj = cast(obj, def);
			def[_check](obj, path, errors, stack.concat(def), shouldCast);
		}
		else if (isPlainObject(def)) {
			for (let key in def) {
				const val = obj ? obj[key] : undefined;
				checkDefinition(val, def[key], formatPath(path, key), errors, stack, shouldCast);
			}
		}
		else {
			const pdef = parseDefinition(def);
			if (pdef.some(part => checkDefinitionPart(obj, part, path, stack, shouldCast))) {
				return shouldCast ? cast(obj, def) : obj
			}

			stackError(errors, def, obj, path);
		}

		return obj
	},

	checkDefinitionPart = (obj, def, path, stack, shouldCast) => {
		if (def === Any) return true
		if (obj == null) return obj === def
		if (isPlainObject(def) || is(Model, def)) { // object or model as part of union type
			const errors = [];
			checkDefinition(obj, def, path, errors, stack, shouldCast);
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
			let result;
			try {
				result = assertion.call(model, obj);
			} catch (err) {
				result = err;
			}
			if (result !== true) {
				const onFail = isFunction(assertion.description) ? assertion.description : (assertionResult, value) =>
					`assertion "${assertion.description}" returned ${format$1(assertionResult)} `
					+ `for ${path ? path + " =" : "value"} ${format$1(value)}`;
				stackError(errors, assertion, obj, path, onFail.call(model, result, obj, path));
			}
		}
	},

	format$1 = (obj, stack = []) => {
		if (stack.length > 15 || stack.includes(obj)) return "..."
		if (obj === null || obj === undefined) return String(obj)
		if (isString(obj)) return `"${obj}"`
		if (is(Model, obj)) return obj.toString(stack)

		stack.unshift(obj);

		if (isFunction(obj)) return obj.name || obj.toString()
		if (is(Map, obj) || is(Set, obj)) return format$1([...obj])
		if (Array.isArray(obj)) return `[${obj.map(item => format$1(item, stack)).join(", ")}]`
		if (obj.toString && obj.toString !== ObjectProto.toString) return obj.toString()
		if (isObject(obj)) {
			const props = Object.keys(obj),
				indent = "\t".repeat(stack.length);
			return `{${props.map(
				key => `\n${indent + key}: ${format$1(obj[key], [...stack])}`
			).join(", ")} ${props.length ? `\n${indent.slice(1)}` : ""}}`
		}

		return String(obj)
	},

	formatPath = (path, key) => path ? path + "." + key : key,

	controlMutation$1 = (model, def, path, o, key, privateAccess, applyMutation) => {
		const newPath = formatPath(path, key),
			isPrivate = model.conventionForPrivate(key),
			isConstant = model.conventionForConstant(key),
			isOwnProperty = has(o, key),
			initialPropDescriptor = isOwnProperty && Object.getOwnPropertyDescriptor(o, key);

		if (key in def && ((isPrivate && !privateAccess) || (isConstant && o[key] !== undefined)))
			cannot(`modify ${isPrivate ? "private" : "constant"} property ${key}`, model);

		applyMutation();
		if (has(def, key)) checkDefinition(o[key], def[key], newPath, model.errors, []);
		checkAssertions(o, model, newPath);

		const nbErrors = model.errors.length;
		if (nbErrors) {
			if (isOwnProperty) Object.defineProperty(o, key, initialPropDescriptor);
			else delete o[key]; // back to the initial property defined in prototype chain

			unstackErrors(model);
		}

		return !nbErrors
	},

	cannot = (msg, model) => {
		model.errors.push({ message: "cannot " + msg });
	},

	cast = (obj, defNode = []) => {
		if (!obj || isPlainObject(defNode) || is(BasicModel, defNode) || isModelInstance(obj))
			return obj // no value or not leaf or already a model instance

		const def = parseDefinition(defNode),
			suitableModels = [];

		for (let part of def) {
			if (is(Model, part) && !is(BasicModel, part) && part.test(obj))
				suitableModels.push(part);
		}

		if (suitableModels.length === 1) {
			// automatically cast to suitable model when explicit (autocasting)
			return new suitableModels[0](obj, _checked)
		}

		if (suitableModels.length > 1)
			console.warn(`Ambiguous model for value ${format$1(obj)}, could be ${suitableModels.join(" or ")}`);

		return obj
	},


	getProp = (val, model, def, path, privateAccess) => {
		if (!isPlainObject(def)) return cast(val, def)
		return proxify(val, getTraps(model, def, path, privateAccess))
	},

	getTraps = (model, def, path, privateAccess) => {
		const grantPrivateAccess = f => proxify(f, {
			apply(fn, ctx, args) {
				privateAccess = true;
				const result = Reflect.apply(fn, ctx, args);
				privateAccess = false;
				return result
			}
		});

		return {
			get(o, key) {
				if (key === _original) return o

				if (!isString(key)) return Reflect.get(o, key)

				const newPath = formatPath(path, key);
				const inDef = has(def, key);
				const defPart = def[key];

				if (!privateAccess && inDef && model.conventionForPrivate(key)) {
					cannot(`access to private property ${newPath}`, model);
					unstackErrors(model);
					return
				}

				let value = o[key];

				if (inDef && value && has(o, key) && !isPlainObject(defPart) && !isModelInstance(value)) {
					Reflect.set(o, key, value = cast(value, defPart)); // cast nested models
				}

				if (isFunction(value) && key !== "constructor" && !privateAccess) {
					return grantPrivateAccess(value)
				}

				if (isPlainObject(defPart) && !value) {
					o[key] = value = {}; // null-safe traversal
				}

				return getProp(value, model, defPart, newPath, privateAccess)
			},

			set(o, key, val) {
				return controlMutation$1(model, def, path, o, key, privateAccess, () => Reflect.set(o, key, cast(val, def[key])))
			},

			deleteProperty(o, key) {
				return controlMutation$1(model, def, path, o, key, privateAccess, () => Reflect.deleteProperty(o, key))
			},

			defineProperty(o, key, args) {
				return controlMutation$1(model, def, path, o, key, privateAccess, () => Reflect.defineProperty(o, key, args))
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
		}
	};


function Model(def) {
	return isPlainObject(def) ? new ObjectModel(def) : new BasicModel(def)
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
		define(this, "name", name);
		return this
	},

	defaultTo(val) {
		this.default = this(val);
		return this
	},

	[_check](obj, path, errors, stack, shouldCast) {
		checkDefinition(obj, this.definition, path, errors, stack, shouldCast);
		checkAssertions(obj, this, path, errors);
	},

	test(obj, errorCollector) {
		let model = this;
		while (!has(model, "errorCollector")) {
			model = getProto(model);
		}

		const initialErrorCollector = model.errorCollector;
		let failed;

		model.errorCollector = errors => {
			failed = true;
			if (errorCollector) errorCollector.call(this, errors);
		};

		new this(obj); // may trigger errorCollector

		model.errorCollector = initialErrorCollector;
		return !failed
	},

	errorCollector(errors) {
		const e = new TypeError(errors.map(e => e.message).join("\n"));
		e.stack = e.stack.replace(/\n.*object-model(.|\n)*object-model.*/, ""); // blackbox objectmodel in stacktrace
		throw e
	},

	assert(assertion, description = format$1(assertion)) {
		define(assertion, "description", description);
		this.assertions = this.assertions.concat(assertion);
		return this
	}
});

Model.CHECK_ONCE = CHECK_ONCE;

function BasicModel(def) {
	return initModel(def, BasicModel)
}

extend(BasicModel, Model, {
	extend(...newParts) {
		const child = extendModel(new BasicModel(extendDefinition(this.definition, newParts)), this);
		for (let part of newParts) {
			if (is(BasicModel, part)) child.assertions.push(...part.assertions);
		}

		return child
	}
});

function ObjectModel(def) {
	return initModel(def, ObjectModel, Object, initObjectModel, model => getTraps(model, def), true)
}

extend(ObjectModel, Model, {
	defaultTo(obj) {
		const def = this.definition;
		for (let key in obj) {
			if (has(def, key)) {
				obj[key] = checkDefinition(obj[key], def[key], key, this.errors, [], true);
			}
		}
		unstackErrors(this);
		this.default = obj;
		return this
	},

	toString(stack) {
		return format$1(this.definition, stack)
	},

	extend(...newParts) {
		const definition = { ...this.definition };
		const proto = { ...this.prototype };
		const defaults = { ...this.default };
		const newAssertions = [];

		for (let part of newParts) {
			if (is(Model, part)) {
				merge(definition, part.definition);
				merge(defaults, part.default);
				newAssertions.push(...part.assertions);
			}
			if (isFunction(part)) merge(proto, part.prototype);
			if (isObject(part)) merge(definition, part);
		}

		const submodel = extendModel(new ObjectModel(definition), this, proto).defaultTo(defaults);
		submodel.assertions = [...this.assertions, ...newAssertions];

		if (getProto(this) !== ObjectModel.prototype) { // extended class
			submodel.parentClass = this;
		}

		return submodel
	},

	[_check](obj, path, errors, stack, shouldCast) {
		if (isObject(obj)) {
			checkDefinition(obj[_original] || obj, this.definition, path, errors, stack, shouldCast);
		}
		else stackError(errors, this, obj, path);

		checkAssertions(obj, this, path, errors);
	}
});

const Any = proxify(BasicModel(), {
	apply(target, ctx, [def]) {
		const anyOf = Object.create(Any);
		anyOf.definition = def;
		return anyOf
	}
});
Any.definition = Any;
Any.toString = () => "Any";

Any.remaining = function (def) { this.definition = def; };
extend(Any.remaining, Any, {
	toString() { return "..." + formatDefinition(this.definition) }
});
Any[Symbol.iterator] = function* () { yield new Any.remaining(this.definition); };

const initListModel = (base, constructor, def, init, clone, mutators, otherTraps) => {

	return initModel(def, constructor, base, init, model => Object.assign({
		getPrototypeOf: () => model.prototype,
		get(l, key) {
			if (key === _original) return l

			const val = l[key];
			return isFunction(val) ? proxify(val, {
				apply(fn, ctx, args) {
					if (has(mutators, key)) {
						// indexes of arguments to check def + cast
						const [begin, end = args.length - 1, getArgDef] = mutators[key];
						for (let i = begin; i <= end; i++) {
							const argDef = getArgDef ? getArgDef(i) : model.definition;
							args[i] = checkDefinition(
								args[i],
								argDef,
								`${base.name}.${key} arguments[${i}]`,
								model.errors,
								[],
								true
							);
						}

						if (model.assertions.length > 0) {
							const testingClone = clone(l);
							fn.apply(testingClone, args);
							checkAssertions(testingClone, model, `after ${key} mutation`);
						}

						unstackErrors(model);
					}

					return fn.apply(l, args)
				}
			}) : val
		}
	}, otherTraps))
};

function ArrayModel(initialDefinition) {
	const model = initListModel(
		Array,
		ArrayModel,
		initialDefinition,
		a => Array.isArray(a) ? a.map(arg => cast(arg, model.definition)) : a,
		a => [...a],
		{
			"copyWithin": [],
			"fill": [0, 0],
			"pop": [],
			"push": [0],
			"reverse": [],
			"shift": [],
			"sort": [],
			"splice": [2],
			"unshift": [0]
		},
		{
			set(arr, key, val) {
				return controlMutation(model, arr, key, val, (a, v) => a[key] = v, true)
			},

			deleteProperty(arr, key) {
				return controlMutation(model, arr, key, undefined, a => delete a[key])
			}
		}
	);

	return model
}

extend(ArrayModel, Model, {
	toString(stack) {
		return "Array of " + formatDefinition(this.definition, stack)
	},

	[_check](arr, path, errors, stack, shouldCast) {
		if (Array.isArray(arr))
			(arr[_original] || arr).forEach((a, i) => checkDefinition(a, this.definition, `${path || "Array"}[${i}]`, errors, stack, shouldCast));
		else stackError(errors, this, arr, path);

		checkAssertions(arr, this, path, errors);
	},

	extend(...newParts) {
		return extendModel(new ArrayModel(extendDefinition(this.definition, newParts)), this)
	}
});

const controlMutation = (model, array, key, value, applyMutation, canBeExtended) => {
	const path = `Array[${key}]`;
	const isInDef = (+key >= 0 && (canBeExtended || key in array));
	if (isInDef) value = checkDefinition(value, model.definition, path, model.errors, [], true);

	const testArray = [...array];
	applyMutation(testArray);
	checkAssertions(testArray, model, path);
	const isSuccess = !unstackErrors(model);
	if (isSuccess) applyMutation(array, value);
	return isSuccess
};

function SetModel(initialDefinition) {
	const model = initListModel(
		Set,
		SetModel,
		initialDefinition,
		it => isIterable(it) ? new Set([...it].map(val => cast(val, model.definition))) : it,
		set => new Set(set),
		{
			"add": [0, 0],
			"delete": [],
			"clear": []
		}
	);

	return model
}

extend(SetModel, Model, {
	toString(stack) {
		return "Set of " + formatDefinition(this.definition, stack)
	},

	[_check](set, path, errors, stack, shouldCast) {
		if (is(Set, set)) {
			for (let item of set.values()) {
				checkDefinition(item, this.definition, `${path || "Set"} value`, errors, stack, shouldCast);
			}
		} else stackError(errors, this, set, path);
		checkAssertions(set, this, path, errors);
	},

	extend(...newParts) {
		return extendModel(new SetModel(extendDefinition(this.definition, newParts)), this)
	}
});

function MapModel(initialKeyDefinition, initialValueDefinition) {
	const getDef = i => i === 0 ? model.definition.key : model.definition.value;
	const model = initListModel(
		Map,
		MapModel,
		{ key: initialKeyDefinition, value: initialValueDefinition },
		it => isIterable(it) ? new Map([...it].map(pair => pair.map((x, i) => cast(x, getDef(i))))) : it,
		map => new Map(map),
		{
			"set": [0, 1, getDef],
			"delete": [],
			"clear": []
		}
	);

	return model
}

extend(MapModel, Model, {
	toString(stack) {
		return `Map of ${formatDefinition(this.definition.key, stack)} : ${formatDefinition(this.definition.value, stack)}`
	},

	[_check](map, path, errors, stack, shouldCast) {
		if (is(Map, map)) {
			path = path || "Map";
			for (let [key, value] of map) {
				checkDefinition(key, this.definition.key, `${path} key`, errors, stack, shouldCast);
				checkDefinition(value, this.definition.value, `${path}[${format$1(key)}]`, errors, stack, shouldCast);
			}
		} else stackError(errors, this, map, path);

		checkAssertions(map, this, path, errors);
	},

	extend(keyParts, valueParts) {
		return extendModel(new MapModel(
			extendDefinition(this.definition.key, keyParts),
			extendDefinition(this.definition.value, valueParts)
		), this)
	}
});

function FunctionModel(...argsDef) {
	return initModel({ arguments: argsDef }, FunctionModel, Function, null, model => ({
		getPrototypeOf: () => model.prototype,

		get(fn, key) {
			return key === _original ? fn : fn[key]
		},

		apply(fn, ctx, args) {
			const def = model.definition;
			const remainingArgDef = def.arguments.find(argDef => is(Any.remaining, argDef));
			const nbArgsToCheck = remainingArgDef ? Math.max(args.length, def.arguments.length - 1) : def.arguments.length;

			for (let i = 0; i < nbArgsToCheck; i++) {
				const argDef = remainingArgDef && i >= def.arguments.length - 1 ? remainingArgDef.definition : def.arguments[i];
				args[i] = checkDefinition(args[i], argDef, `arguments[${i}]`, model.errors, [], true);
			}

			checkAssertions(args, model, "arguments");

			let result;
			if (!model.errors.length) {
				result = Reflect.apply(fn, ctx, args);
				if ("return" in def)
					result = checkDefinition(result, def.return, "return value", model.errors, [], true);
			}
			unstackErrors(model);
			return result
		}
	}))
}

extend(FunctionModel, Model, {
	toString(stack = []) {
		let out = `Function(${this.definition.arguments.map(
			argDef => formatDefinition(argDef, [...stack])
		).join(", ")})`;

		if ("return" in this.definition) {
			out += " => " + formatDefinition(this.definition.return, stack);
		}
		return out
	},

	return(def) {
		this.definition.return = def;
		return this
	},

	[_check](f, path, errors) {
		if (!isFunction(f)) stackError(errors, "Function", f, path);
	}
});

const styles = {
	list: "list-style-type: none; padding: 0; margin: 0;",
	listItem: "padding: 0 0 0 1em;",
	model: "color: #3e999f;",
	instance: "color: #718c00; font-style: italic",
	function: "color: #4271AE",
	string: "color: #C41A16",
	number: "color: #1C00CF",
	boolean: "color: #AA0D91",
	property: "color: #8959a8",
	private: "color: #C19ED8",
	constant: "color: #8959a8; font-weight: bold",
	privateConstant: "color: #C19ED8; font-weight: bold",
	null: "color: #8e908c",
	undeclared: "color: #C0C0C0;",
	proto: "color: #B871BD; font-style: italic"
};

const getModel = (instance) => {
	if (instance === undefined || instance === null)
		return null

	const proto = getProto(instance);
	if (!proto || !proto.constructor || !is(Model, proto.constructor))
		return null

	return proto.constructor
};

const span = (style, ...children) => ["span", { style }, ...children];

const format = (x, config = {}) => {
	if (x === null || x === undefined)
		return span(styles.null, "" + x);

	if (typeof x === "boolean")
		return span(styles.boolean, x);

	if (typeof x === "number")
		return span(styles.number, x);

	if (typeof x === "string")
		return span(styles.string, `"${x}"`);

	if (Array.isArray(x) && config.isModelDefinition) {
		return span("", ...x.flatMap(part => [format(part, config), " or "]).slice(0, -1))
	}

	if (isPlainObject(x))
		return formatObject(x, getModel(x), config)

	if (isFunction(x) && !is(Model, x) && config.isModelDefinition)
		return span(styles.function, x.name || x.toString());

	return ["object", { object: x, config }]
};

const formatObject = (o, model, config) => span("",
	"{",
	["ol", { style: styles.list }, ...Object.keys(o).map(prop =>
		["li", { style: styles.listItem }, span(styles.property, prop), ": ", format(o[prop], config)])
	],
	"}"
);

const formatModel = model => {
	const
		cfg = { isModelDefinition: true },
		def = model.definition,
		formatList = (list, map) => list.flatMap(e => [map(e), ", "]).slice(0, -1);
	let parts = [];

	if (is(BasicModel, model)) parts = [format(def, cfg)];
	if (is(ArrayModel, model)) parts = ["Array of ", format(def, cfg)];
	if (is(SetModel, model)) parts = ["Set of ", format(def, cfg)];
	if (is(MapModel, model)) parts = ["Map of ", format(def.key, cfg), " : ", format(def.value, cfg)];
	if (is(FunctionModel, model)) {
		parts = ["Function(", ...formatList(def.arguments, arg => format(arg, cfg)), ")"];
		if ("return" in def) parts.push(" => ", format(def.return, cfg));
	}

	if (model.assertions.length > 0) {
		parts.push("\n(assertions: ", ...formatList(model.assertions, f => ["object", { object: f }]), ")");
	}

	return span(styles.model, ...parts)
};

const ModelFormatter = {
	header(x, config = {}) {
		if (x === Any)
			return span(styles.model, "Any")

		if (is(Any.remaining, x))
			return span(styles.model, "...", format(x.definition, { isModelDefinition: true }))

		if (is(ObjectModel, x))
			return span(styles.model, x.name)

		if (is(Model, x)) {
			return formatModel(x)
		}

		if (config.isModelDefinition && isPlainObject(x))
			return format(x, config)

		return null;
	},
	hasBody(x) {
		return is(ObjectModel, x)
	},
	body(model) {
		return span("",
			"{",
			["ol", { style: styles.list }, ...Object.keys(model.definition).map(prop => {
				const isPrivate = model.conventionForPrivate(prop);
				const isConstant = model.conventionForConstant(prop);
				const hasDefault = model.default && has(model.default, prop);
				let style = styles.property;

				if (isPrivate) {
					style = isConstant ? styles.privateConstant : styles.private;
				} else if (isConstant) {
					style = styles.constant;
				}

				return ["li", { style: styles.listItem },
					span(style, prop), ": ", format(model.definition[prop], { isModelDefinition: true }),
					hasDefault ? span(styles.proto, " = ", format(model.default[prop])) : ""
				]
			})],
			"}"
		)
	}
};

const ModelInstanceFormatter = {
	header(x, config = {}) {
		if (config.isInstanceProperty && isPlainObject(x)) {
			return format(x, config)
		}

		const model = getModel(x);
		if (is(Model, model)) {
			const parts = is(ObjectModel, model) ? [model.name] : [["object", { object: x[_original] }], ` (${model.name})`];
			return span(styles.instance, ...parts)
		}

		return null;
	},
	hasBody(x) {
		return x && is(ObjectModel, getModel(x))
	},
	body(x) {
		const model = getModel(x);
		const o = x[_original] || x;
		return span("",
			"{",
			[
				"ol",
				{ style: styles.list },
				...Object.keys(o).map(prop => {
					const isPrivate = model.conventionForPrivate(prop);
					const isConstant = model.conventionForConstant(prop);
					const isDeclared = prop in model.definition;
					let style = styles.property;

					if (!isDeclared) {
						style = styles.undeclared;
					} else if (isPrivate) {
						style = isConstant ? styles.privateConstant : styles.private;
					} else if (isConstant) {
						style = styles.constant;
					}

					return ["li", { style: styles.listItem },
						span(style, prop), ": ", format(o[prop], { isInstanceProperty: true })
					]
				}),
				["li", { style: styles.listItem },
					span(styles.proto, "__proto__", ": ", ["object", { object: getProto(x) }])
				]
			],
			"}"
		)
	}
};

if (typeof window !== "undefined") {
	window.devtoolsFormatters = (window.devtoolsFormatters || [])
		.concat(ModelFormatter, ModelInstanceFormatter);
}

;
//# sourceMappingURL=object-model.js.map

exports.Any=Any;
exports.ArrayModel=ArrayModel;
exports.BasicModel=BasicModel;
exports.FunctionModel=FunctionModel;
exports.MapModel=MapModel;
exports.Model=Model;
exports.ObjectModel=ObjectModel;
exports.SetModel=SetModel;