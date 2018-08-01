// ObjectModel v3.6.0 - http://objectmodel.js.org
// MIT License - Sylvain Pollet-Villard
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.window = global.window || {})));
}(this, (function (exports) { 'use strict';

	const
		bettertypeof = x => Object.prototype.toString.call(x).match(/\s([a-zA-Z]+)/)[1],
		getProto = x => Object.getPrototypeOf(x),
		setProto = (x, p) => Object.setPrototypeOf(x, p),

		has = (o, prop) => o.hasOwnProperty(prop),
		is = (Constructor, obj) => obj instanceof Constructor,
		isFunction = f => typeof f === "function",
		isObject = o => typeof o === "object",
		isPlainObject = o => o && isObject(o) && getProto(o) === Object.prototype,
		isIterable = x => x && isFunction(x[Symbol.iterator]),

		proxifyFn = (fn, apply) => new Proxy(fn, { apply }),
		proxifyModel = (val, model, traps) => new Proxy(val, Object.assign({ getPrototypeOf: () => model.prototype }, traps)),

		merge = (target, src = {}, deep) => {
			for (let key in src) {
				if (deep && isPlainObject(src[key])) {
					let o = {};
					merge(o, target[key], deep);
					merge(o, src[key], deep);
					target[key] = o;
				} else {
					target[key] = src[key];
				}
			}
		},

		define = (obj, key, value, enumerable = false) => {
			Object.defineProperty(obj, key, { value, enumerable, writable: true, configurable: true });
		},

		setConstructor = (model, constructor) => {
			setProto(model, constructor.prototype);
			define(model, "constructor", constructor);
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
		_constructor = Symbol(),
		_validate = Symbol(),
		_original = Symbol(),
		_get = Symbol(), // used to bypass private access

		initModel = (model, def) => {
			model.definition = def;
			model.assertions = [...model.assertions];
			define(model, "errors", []);
			delete model.name;
		},

		extendModel = (child, parent, newProps) => {
			extend(child, parent, newProps);
			child.assertions.push(...parent.assertions);
			return child
		},

		stackError = (errors, expected, received, path, message) => {
			errors.push({ expected, received, path, message });
		},

		unstackErrors = (model, errorCollector = model.errorCollector) => {
			let nbErrors = model.errors.length;
			if (nbErrors > 0) {
				let errors = model.errors.map(err => {
					if (!err.message) {
						let def = Array.isArray(err.expected) ? err.expected : [err.expected];
						err.message = "expecting " + (err.path ? err.path + " to be " : "") + def.map(d => format(d)).join(" or ")
							+ ", got " + (err.received != null ? bettertypeof(err.received) + " " : "") + format(err.received);
					}
					return err
				});
				model.errors = [];
				errorCollector.call(model, errors); // throw all errors collected
			}
			return nbErrors
		},

		isModelInstance = i => i && is(Model, getProto(i).constructor),

		parseDefinition = (def) => {
			if (isPlainObject(def)) {
				Object.keys(def).map(key => { def[key] = parseDefinition(def[key]); });
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
			if (!Array.isArray(newParts)) newParts = [newParts];
			if (newParts.length > 0) {
				def = newParts
					.reduce((def, ext) => def.concat(ext), Array.isArray(def) ? [...def] : [def]) // clone to lose ref
					.filter((value, index, self) => self.indexOf(value) === index); // remove duplicates
			}

			return def
		},

		checkDefinition = (obj, def, path, errors, stack) => {
			let indexFound = stack.indexOf(def);
			if (indexFound !== -1 && stack.indexOf(def, indexFound + 1) !== -1)
				return obj //if found twice in call stack, cycle detected, skip validation

			obj = cast(obj, def);

			if (is(Model, def)) {
				def[_validate](obj, path, errors, stack.concat(def));
			}
			else if (isPlainObject(def)) {
				Object.keys(def).map(key => {
					let val = obj ? obj[_get] ? obj[_get](key) : obj[key] : undefined;
					checkDefinition(val, def[key], formatPath(path, key), errors, stack);
				});
			}
			else {
				let pdef = parseDefinition(def);
				if (pdef.some(part => checkDefinitionPart(obj, part, path, stack)))
					return obj

				stackError(errors, def, obj, path);
			}

			return obj
		},

		checkDefinitionPart = (obj, def, path, stack) => {
			if (obj == null) return obj === def
			if (isPlainObject(def) || is(Model, def)) { // object or model as part of union type
				let errors = [];
				checkDefinition(obj, def, path, errors, stack);
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
					let onFail = isFunction(assertion.description) ? assertion.description : (assertionResult, value) =>
						`assertion "${assertion.description}" returned ${format(assertionResult)} `
						+ `for ${path ? path + " =" : "value"} ${format(value)}`;
					stackError(errors, assertion, obj, path, onFail.call(model, result, obj, path));
				}
			}
		},

		format = (obj, stack = []) => {
			if (stack.length > 15 || stack.includes(obj)) return '...'
			if (obj === null || obj === undefined) return String(obj)
			if (typeof obj === 'string') return `"${obj}"`
			if (is(Model, obj)) return obj.toString(stack)

			stack.unshift(obj);

			if (isFunction(obj)) return obj.name || obj.toString()
			if (is(Map, obj) || is(Set, obj)) return format([...obj])
			if (Array.isArray(obj)) return `[${obj.map(item => format(item, stack)).join(', ')}]`
			if (obj.toString !== Object.prototype.toString) return obj.toString()
			if (obj && isObject(obj)) {
				let props = Object.keys(obj),
					indent = '\t'.repeat(stack.length);
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
				initialPropDescriptor = isOwnProperty && Object.getOwnPropertyDescriptor(o, key);

			if (key in def && ((isPrivate && !privateAccess) || (isConstant && o[key] !== undefined)))
				cannot(`modify ${isPrivate ? "private" : "constant"} property ${key}`, model);

			let isInDefinition = has(def, key);
			if (isInDefinition || !model.sealed) {
				applyMutation(newPath);
				if (isInDefinition) checkDefinition(o[key], def[key], newPath, model.errors, []);
				checkAssertions(o, model, newPath);
			}
			else rejectUndeclaredProp(newPath, o[key], model.errors);

			let nbErrors = model.errors.length;
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

		rejectUndeclaredProp = (path, received, errors) => {
			errors.push({
				path,
				received,
				message: `property ${path} is not declared in the sealed model definition`
			});
		},

		cast = (obj, defNode = []) => {
			if (!obj || isPlainObject(defNode) || isModelInstance(obj))
				return obj // no value or not leaf or already a model instance

			let def = parseDefinition(defNode),
				suitableModels = [];

			for (let part of def) {
				if (is(Model, part) && part.test(obj))
					suitableModels.push(part);
			}

			if (suitableModels.length === 1) {
				// automatically cast to suitable model when explicit (duck typing)
				let duck = suitableModels[0];
				return is(ObjectModel, duck) ? new duck(obj) : duck(obj)
			}

			if (suitableModels.length > 1)
				console.warn(`Ambiguous model for value ${format(obj)}, could be ${suitableModels.join(" or ")}`);

			return obj
		},

		checkUndeclaredProps = (obj, def, errors, path) => {
			Object.keys(obj).map(key => {
				let val = obj[key],
					subpath = formatPath(path, key);
				if (!has(def, key)) rejectUndeclaredProp(subpath, val, errors);
				else if (isPlainObject(val)) checkUndeclaredProps(val, def[key], errors, subpath);
			});
		},

		getProxy = (model, obj, def, path, privateAccess) => {
			if (!isPlainObject(def)) return cast(obj, def)

			const grantTemporaryPrivateAccess = f => proxifyFn(f, (fn, ctx, args) => {
				privateAccess = true;
				let result = Reflect.apply(fn, ctx, args);
				privateAccess = false;
				return result
			});

			return new Proxy(obj, {

				getPrototypeOf: () => path ? Object.prototype : getProto(obj),

				get(o, key) {
					if (key === _original) return o
					if (key === _get) return grantTemporaryPrivateAccess(prop => o[prop])

					if (typeof key !== "string") return Reflect.get(o, key)

					let newPath = formatPath(path, key),
						defPart = def[key];

					if (!privateAccess && key in def && model.conventionForPrivate(key)) {
						cannot(`access to private property ${newPath}`, model);
						unstackErrors(model);
						return
					}

					if (o[key] && has(o, key) && !isPlainObject(defPart) && !isModelInstance(o[key])) {
						o[key] = cast(o[key], defPart); // cast nested models
					}

					if (isFunction(o[key]) && key !== "constructor") {
						return grantTemporaryPrivateAccess(o[key])
					}

					if (isPlainObject(defPart) && !o[key]) {
						o[key] = {}; // null-safe traversal
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
		};


	function Model(def, params) {
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
			this.default = val;
			return this
		},

		[_validate](obj, path, errors, stack) {
			checkDefinition(obj, this.definition, path, errors, stack);
			checkAssertions(obj, this, path, errors);
		},

		validate(obj, errorCollector) {
			this[_validate](obj, null, this.errors, []);
			return !unstackErrors(this, errorCollector)
		},

		test(obj) {
			let model = this;
			while (!has(model, "errorCollector")) {
				model = getProto(model);
			}

			let initialErrorCollector = model.errorCollector,
				failed;

			model.errorCollector = () => {
				failed = true;
			};

			new this(obj); // may trigger this.errorCollector

			model.errorCollector = initialErrorCollector;
			return !failed
		},

		errorCollector(errors) {
			let e = new TypeError(errors.map(e => e.message).join('\n'));
			e.stack = e.stack.replace(/\n.*object-model(.|\n)*object-model.*/, ""); // blackbox objectmodel in stacktrace
			throw e
		},

		assert(assertion, description = format(assertion)) {
			define(assertion, "description", description);
			this.assertions = this.assertions.concat(assertion);
			return this
		}
	});


	function BasicModel(def) {
		let model = function (val = model.default) {
			return model.validate(val) ? val : undefined
		};

		setConstructor(model, BasicModel);
		initModel(model, def);
		return model
	}

	extend(BasicModel, Model, {
		extend(...newParts) {
			let child = extendModel(new BasicModel(extendDefinition(this.definition, newParts)), this);
			for (let part of newParts) {
				if (is(BasicModel, part)) child.assertions.push(...part.assertions);
			}

			return child
		}
	});


	function ObjectModel(def, params) {
		let model = function (obj = model.default) {
			if (!is(model, this)) return new model(obj)
			if (is(model, obj)) return obj

			if (!is(Object, obj) && obj !== undefined) {
				stackError(model.errors, Object, obj);
			}

			merge(this, model[_constructor](obj), true);

			if (!model.validate(this)) return
			return getProxy(model, this, model.definition)
		};

		Object.assign(model, params);
		extend(model, Object);
		setConstructor(model, ObjectModel);
		initModel(model, def);
		return model
	}

	extend(ObjectModel, Model, {
		sealed: false,

		defaults(p) {
			Object.assign(this.prototype, p);
			return this
		},

		toString(stack) {
			return format(this.definition, stack)
		},

		extend(...newParts) {
			let def = Object.assign({}, this.definition),
				newAssertions = [],
				proto = {};

			merge(proto, this.prototype, false);

			for (let part of newParts) {
				if (is(Model, part)) {
					merge(def, part.definition, true);
					newAssertions.push(...part.assertions);
				}
				if (isFunction(part)) merge(proto, part.prototype, true);
				if (isObject(part)) merge(def, part, true);
			}

			let submodel = extendModel(new ObjectModel(def), this, proto);
			submodel.assertions = [...this.assertions, ...newAssertions];

			if (getProto(this) !== ObjectModel.prototype) { // extended class
				submodel[_constructor] = (obj) => {
					let parentInstance = new this(obj);
					merge(obj, parentInstance, true); // get modified props from parent class constructor
					return obj
				};
			}

			return submodel
		},

		[_constructor]: o => o,

		[_validate](obj, path, errors, stack) {
			if (isObject(obj)) {
				let def = this.definition;
				checkDefinition(obj, def, path, errors, stack);
				if (this.sealed) checkUndeclaredProps(obj, def, errors);
			}
			else stackError(errors, this, obj, path);

			checkAssertions(obj, this, path, errors);
		}
	});

	const initListModel = (base, constructor, def, init, clone, mutators, otherTraps = {}) => {

		let model = function (list = model.default) {
			list = init(list);

			if (model.validate(list)) return proxifyModel(list, model, Object.assign({
				get(l, key) {
					if (key === _original) return l

					let val = l[key];
					return isFunction(val) ? proxifyFn(val, (fn, ctx, args) => {
						if (has(mutators, key)) {
							if (mutators[key]) args = mutators[key](args); // autocast method args

							let testingClone = clone(l);
							fn.apply(testingClone, args);
							model.validate(testingClone);
						}

						return fn.apply(l, args)
					}) : val
				}
			}, otherTraps))
		};

		extend(model, base);
		setConstructor(model, constructor);
		initModel(model, def);
		return model
	};

	function ArrayModel(def) {
		let castAll = args => args.map(arg => cast(arg, def));

		let model = initListModel(
			Array,
			ArrayModel,
			def,
			a => Array.isArray(a) ? castAll(a) : a,
			a => [...a],
			{
				"copyWithin": 0,
				"fill": ([val, ...rest]) => [cast(val, def), ...rest],
				"pop": 0,
				"push": castAll,
				"reverse": 0,
				"shift": 0,
				"sort": 0,
				"splice": ([start, end, ...vals]) => [start, end, ...castAll(vals)],
				"unshift": castAll,
			},
			{
				set(arr, key, val) {
					return setArrayKey(arr, key, val, model)
				},

				deleteProperty(arr, key) {
					return !(key in arr) || setArrayKey(arr, key, undefined, model)
				}
			}
		);

		return model
	}

	extend(ArrayModel, Model, {
		toString(stack) {
			return 'Array of ' + formatDefinition(this.definition, stack)
		},

		[_validate](arr, path, errors, stack) {
			if (Array.isArray(arr))
				arr.forEach((a, i) => {
					arr[i] = checkDefinition(a, this.definition, `${path || "Array"}[${i}]`, errors, stack);
				});
			else stackError(errors, this, arr, path);

			checkAssertions(arr, this, path, errors);
		},

		extend(...newParts) {
			return extendModel(new ArrayModel(extendDefinition(this.definition, newParts)), this)
		}
	});

	let setArrayKey = (array, key, value, model) => {
		let path = `Array[${key}]`;
		if (parseInt(key) === +key && key >= 0)
			value = checkDefinition(value, model.definition, path, model.errors, []);

		let testArray = [...array];
		testArray[key] = value;
		checkAssertions(testArray, model, path);
		let isSuccess = !unstackErrors(model);
		if (isSuccess) array[key] = value;
		return isSuccess
	};

	function SetModel(def) {
		return initListModel(
			Set,
			SetModel,
			def,
			it => isIterable(it) ? new Set([...it].map(val => cast(val, def))) : it,
			set => new Set(set),
			{
				"add": ([val]) => [cast(val, def)],
				"delete": 0,
				"clear": 0
			}
		)
	}

	extend(SetModel, Model, {
		toString(stack) {
			return "Set of " + formatDefinition(this.definition, stack)
		},

		[_validate](set, path, errors, stack) {
			if (is(Set, set)) {
				for (let item of set.values()) {
					checkDefinition(item, this.definition, `${path || "Set"} value`, errors, stack);
				}
			} else stackError(errors, this, set, path);
			checkAssertions(set, this, path, errors);
		},

		extend(...newParts) {
			return extendModel(new SetModel(extendDefinition(this.definition, newParts)), this)
		}
	});

	function MapModel(key, value) {

		let castKeyValue = ([k, v]) => [cast(k, key), cast(v, value)];

		return initListModel(
			Map,
			MapModel,
			{ key, value },
			it => isIterable(it) ? new Map([...it].map(castKeyValue)) : it,
			map => new Map(map),
			{
				"set": castKeyValue,
				"delete": 0,
				"clear": 0
			}
		)
	}

	extend(MapModel, Model, {
		toString(stack) {
			let { key, value } = this.definition;
			return `Map of ${formatDefinition(key, stack)} : ${formatDefinition(value, stack)}`
		},

		[_validate](map, path, errors, stack) {
			if (is(Map, map)) {
				path = path || 'Map';
				for (let [key, value] of map) {
					checkDefinition(key, this.definition.key, `${path} key`, errors, stack);
					checkDefinition(value, this.definition.value, `${path}[${format(key)}]`, errors, stack);
				}
			} else stackError(errors, this, map, path);

			checkAssertions(map, this, path, errors);
		},

		extend(keyPart, valuePart) {
			let { key, value } = this.definition;
			return extendModel(new MapModel(extendDefinition(key, keyPart), extendDefinition(value, valuePart)), this)
		}
	});

	function FunctionModel(...argsDef) {

		let model = function (fn = model.default) {
			if (!model.validate(fn)) return
			return proxifyModel(fn, model, {
				get(fn, key) {
					if (key === _original) return fn
					return fn[key]
				},

				apply(fn, ctx, args) {
					let def = model.definition;

					def.arguments.forEach((argDef, i) => {
						args[i] = checkDefinition(args[i], argDef, `arguments[${i}]`, model.errors, []);
					});

					checkAssertions(args, model, "arguments");

					let result;
					if (!model.errors.length) {
						result = Reflect.apply(fn, ctx, args);
						if ("return" in def)
							result = checkDefinition(result, def.return, "return value", model.errors, []);
					}
					unstackErrors(model);
					return result
				}
			});
		};

		extend(model, Function);
		setConstructor(model, FunctionModel);
		initModel(model, { arguments: argsDef });

		return model
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

		extend(newArgs, newReturns) {
			let args = this.definition.arguments,
				mixedArgs = newArgs.map((a, i) => extendDefinition(i in args ? args[i] : [], newArgs[i])),
				mixedReturns = extendDefinition(this.definition.return, newReturns);
			return extendModel(new FunctionModel(...mixedArgs).return(mixedReturns), this)
		},

		[_validate](f, path, errors) {
			if (!isFunction(f)) stackError(errors, "Function", f, path);
		}
	});

	FunctionModel.prototype.assert(function numberOfArgs(args) {
		return (args.length > this.definition.arguments.length) ? args : true
	}, function (args) {
		return `expecting ${this.definition.arguments.length} arguments for ${format(this)}, got ${args.length}`
	});

	const styles = {
		list: `list-style-type: none; padding: 0; margin: 0;`,
		listItem: `padding: 0 0 0 1em;`,
		model: `color: #3e999f;`,
		sealedModel: `color: #3e999f; font-weight: bold`,
		instance: `color: #718c00; font-style: italic`,
		function: `color: #4271AE`,
		string: `color: #C41A16`,
		number: `color: #1C00CF`,
		boolean: `color: #AA0D91`,
		property: `color: #8959a8`,
		private: `color: #C19ED8`,
		constant: `color: #8959a8; font-weight: bold`,
		privateConstant: `color: #C19ED8; font-weight: bold`,
		null: `color: #8e908c`,
		undeclared: `color: #C0C0C0;`,
		proto: `color: #B871BD; font-style: italic`
	};

	const getModel = (instance) => {
		if (instance === undefined || instance === null)
			return null

		let proto = getProto(instance);
		if (!proto || !proto.constructor || !is(Model, proto.constructor))
			return null

		return proto.constructor
	};

	const span = (style, ...children) => ["span", {style}, ...children];

	const format$1 = (x, config={}) => {
		if (x === null || x === undefined)
			return span(styles.null, ""+x);

		if (typeof x === "boolean")
			return span(styles.boolean, x);

		if (typeof x === "number")
			return span(styles.number, x);

		if (typeof x === "string")
			return span(styles.string, `"${x}"`);

		if (Array.isArray(x) && config.isModelDefinition) {
			let def = [];
			if (x.length === 1) x.push(undefined, null);
			for (let i = 0; i < x.length; i++) {
				def.push(format$1(x[i], config));
				if (i < x.length - 1) def.push(' or ');
			}
			return span('', ...def)
		}

		if (isPlainObject(x))
			return formatObject(x, getModel(x), config)

		if (isFunction(x) && !is(Model, x) && config.isModelDefinition)
			return span(styles.function, x.name || x.toString());

		return ['object', {object: x, config}]
	};

	const formatObject = (o, model, config) => span('',
		'{',
		['ol', {style: styles.list}, ...Object.keys(o).map(prop =>
			['li', {style: styles.listItem}, span(styles.property, prop), ': ', format$1(o[prop], config) ])
		],
		'}'
	);

	const formatModel = model => {
		const parts = [],
		      cfg = { isModelDefinition: true },
		      def = model.definition,
		      formatList = (list, map) => list.reduce((r, e) => [...r, map(e), ", "], []).slice(0, 2 * list.length - 1);

		if (is(BasicModel, model )) parts.push(format$1(def, cfg));
		if (is(ArrayModel, model)) parts.push("Array of ", format$1(def, cfg));
		if (is(SetModel, model)) parts.push("Set of ", format$1(def, cfg));
		if (is(MapModel, model)) parts.push("Map of ", format$1(def.key, cfg), " : ", format$1(def.value, cfg));
		if (is(FunctionModel, model)) {
			parts.push("Function(", ...formatList(def.arguments, arg => format$1(arg, cfg)), ")");
			if ("return" in def) parts.push(" => ", format$1(def.return, cfg));
		}

		if (model.assertions.length > 0) {
			parts.push("\n(assertions: ", ...formatList(model.assertions, f => ['object', { object: f }]), ")");
		}

		return span(styles.model, ...parts)
	};

	const ModelFormatter = {
		header(x, config = {}) {
			if (is(ObjectModel, x))
				return span(x.sealed ? styles.sealedModel : styles.model, x.name)

			if (is(Model, x)) {
				return formatModel(x)
			}

			if (config.isModelDefinition && isPlainObject(x))
				return format$1(x, config)

			return null;
		},
		hasBody(x) {
			return is(ObjectModel, x)
		},
		body(model) {
			return span('',
				'{',
				['ol', {style: styles.list}, ...Object.keys(model.definition).map(prop => {
					let isPrivate = model.conventionForPrivate(prop),
					    isConstant = model.conventionForConstant(prop),
					    hasDefault = model.prototype.hasOwnProperty(prop),
					    style = styles.property;

					if (isPrivate) {
						style = isConstant ? styles.privateConstant : styles.private;
					} else if (isConstant) {
						style = styles.constant;
					}

					return ['li', {style: styles.listItem},
						span(style, prop), ': ', format$1(model.definition[prop], { isModelDefinition: true }),
						hasDefault ? span(styles.proto, ' = ', format$1(model.prototype[prop])) : ''
					]
				}) ],
				'}'
			)
		}
	};

	const ModelInstanceFormatter = {
		header(x, config = {}) {
			if (config.isInstanceProperty && isPlainObject(x)) {
				return format$1(x, config)
			}

			let model = getModel(x);
			if (is(Model, model)) {
				let parts = is(ObjectModel, model) ? [model.name] : [['object', { object: x[_original] }], ` (${model.name})`];
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
			return span('',
				'{',
				[
					'ol',
					{style: styles.list},
					...Object.keys(o).map(prop => {
						let isPrivate = model.conventionForPrivate(prop),
							isConstant = model.conventionForConstant(prop),
							isDeclared = prop in model.definition,
							style = styles.property;

						if (!isDeclared) {
							style = styles.undeclared;
						} else if (isPrivate) {
							style = isConstant ? styles.privateConstant : styles.private;
						} else if (isConstant) {
							style = styles.constant;
						}

						return ['li', {style: styles.listItem},
							span(style, prop), ': ', format$1(o[prop], { isInstanceProperty: true })
						]
					}),
					['li', {style: styles.listItem},
						span(styles.proto, '__proto__', ': ', ['object', {object: getProto(x)}])
					]
				],
				'}'
			)
		}
	};

	if (typeof window !== "undefined") {
		window.devtoolsFormatters = (window.devtoolsFormatters || [])
			.concat(ModelFormatter, ModelInstanceFormatter);
	}

	exports.Model = Model;
	exports.BasicModel = BasicModel;
	exports.ObjectModel = ObjectModel;
	exports.ArrayModel = ArrayModel;
	exports.FunctionModel = FunctionModel;
	exports.MapModel = MapModel;
	exports.SetModel = SetModel;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=object-model.js.map
