// ObjectModel v3.4.3 - http://objectmodel.js.org
// MIT License - Sylvain Pollet-Villard
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.window = global.window || {})));
}(this, (function (exports) { 'use strict';

	const
		bettertypeof = x => Object.prototype.toString.call(x).match(/\s([a-zA-Z]+)/)[1],
		getProto     = x => Object.getPrototypeOf(x),

		has           = (o, prop) => o.hasOwnProperty(prop),
		is            = (Constructor, obj) => obj instanceof Constructor,
		isString      = s => typeof s === "string",
		isFunction    = f => typeof f === "function",
		isObject      = o => typeof o === "object",
		isArray       = a => Array.isArray(a),
		isPlainObject = o => o && isObject(o) && getProto(o) === Object.prototype,

		proxify      = (val, traps) => new Proxy(val, traps),
		proxifyFn    = (fn, apply) => proxify(fn, {apply}),
		proxifyModel = (val, model, traps) => proxify(val, Object.assign({getPrototypeOf: () => model.prototype}, traps)),

		mapProps = (o, fn) => Object.keys(o).map(fn),

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
			Object.defineProperty(obj, key, {value, enumerable, writable: true, configurable: true});
		},

		setConstructor = (model, constructor) => {
			Object.setPrototypeOf(model, constructor.prototype);
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
			Object.setPrototypeOf(child, parent);
		};

	const
		format = (obj, stack = []) => {
			if (stack.length > 15 || stack.includes(obj)) return '...'
			if (obj === null || obj === undefined) return String(obj)
			if (isString(obj)) return `"${obj}"`
			if (is(Model, obj)) return obj.toString(stack)

			stack.unshift(obj);

			if (isFunction(obj)) return obj.name || obj.toString()
			if (is(Map, obj) || is(Set, obj)) return format([...obj])
			if (isArray(obj)) return `[${obj.map(item => format(item, stack)).join(', ')}]`
			if (obj.toString !== Object.prototype.toString) return obj.toString()
			if (obj && isObject(obj)) {
				let props  = Object.keys(obj),
				    indent = '\t'.repeat(stack.length);
				return `{${props.map(
				key => `\n${indent + key}: ${format(obj[key], stack.slice())}`
			).join(',')} ${props.length ? `\n${indent.slice(1)}` : ''}}`
			}

			return String(obj)
		},

		formatPath = (path, key) => path ? path + '.' + key : key;

	const
		_validate = Symbol(),

		parseDefinition = (def) => {
			if (isPlainObject(def)) {
				mapProps(def, key => { def[key] = parseDefinition(def[key]); });
			}
			else if (!isArray(def)) return [def]
			else if (def.length === 1) return [...def, undefined, null]

			return def
		},

		formatDefinition = (def, stack) => parseDefinition(def).map(d => format(d, stack)).join(" or "),

		extendDefinition = (def, newParts = []) => {
			if (!isArray(newParts)) newParts = [newParts];
			if (newParts.length > 0) {
				def = newParts
					.reduce((def, ext) => def.concat(ext), isArray(def) ? def.slice() : [def]) // clone to lose ref
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
				mapProps(def, key => {
					checkDefinition(obj ? obj[key] : undefined, def[key], formatPath(path, key), errors, stack);
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
						+`for ${path ? path+" =" : "value"} ${format(value)}`;
					stackError(errors, assertion, obj, path, onFail.call(model, result, obj, path));
				}
			}
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

			if (suitableModels.length === 1){
				// automatically cast to suitable model when explicit (duck typing)
				let duck = suitableModels[0];
				return duck instanceof ObjectModel ? new duck(obj) : duck(obj)
			}

			if (suitableModels.length > 1)
				console.warn(`Ambiguous model for value ${format(obj)}, could be ${suitableModels.join(" or ")}`);

			return obj
		};

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

	function Model(def, params) {
		return isPlainObject(def) ? new ObjectModel(def, params) : new BasicModel(def)
	}

	Object.assign(Model.prototype, {
		name: "Model",
		assertions: [],

		conventionForConstant: key => key.toUpperCase() === key,
		conventionForPrivate: key => key[0] === "_",

		toString(stack){
			return formatDefinition(this.definition, stack)
		},

		as(name){
			define(this, "name", name);
			return this
		},

		defaultTo(val){
			this.default = val;
			return this
		},

		[_validate](obj, path, errors, stack){
			checkDefinition(obj, this.definition, path, errors, stack);
			checkAssertions(obj, this, path, errors);
		},

		validate(obj, errorCollector){
			this[_validate](obj, null, this.errors, []);
			return !unstackErrors(this, errorCollector)
		},

		test(obj){
			let failed,
			    initialErrorCollector = this.errorCollector;

			this.errorCollector = () => {
				failed = true;
			};

			new this(obj); // may trigger this.errorCollector

			this.errorCollector = initialErrorCollector;
			return !failed
		},

		errorCollector(errors){
			let e = new TypeError(errors.map(e => e.message).join('\n'));
			e.stack = e.stack.replace(/\n.*object-model(.|\n)*object-model.*/, ""); // blackbox objectmodel in stacktrace
			throw e
		},

		assert(assertion, description = format(assertion)){
			define(assertion, "description", description);
			this.assertions = this.assertions.concat(assertion);
			return this
		}
	});

	let initModel = (model, def) => {
		model.definition = def;
		model.assertions = [...model.assertions];
		define(model, "errors", []);
		delete model.name;
	};

	let extendModel = (child, parent, newProps) => {
		extend(child, parent, newProps);
		child.assertions.push(...parent.assertions);
		return child
	};

	let stackError = (errors, expected, received, path, message) => {
		errors.push({expected, received, path, message});
	};

	let unstackErrors = (model, errorCollector = model.errorCollector) => {
		let nbErrors = model.errors.length;
		if (nbErrors > 0) {
			let errors = model.errors.map(err => {
				if (!err.message) {
					let def = isArray(err.expected) ? err.expected : [err.expected];
					err.message = "expecting " + (err.path ? err.path + " to be " : "") + def.map(d => format(d)).join(" or ")
						+ ", got " + (err.received != null ? bettertypeof(err.received) + " " : "") + format(err.received);
				}
				return err
			});
			model.errors = [];
			errorCollector.call(model, errors); // throw all errors collected
		}
		return nbErrors
	};

	let isModelInstance = i => i && is(Model, getProto(i).constructor);

	const _constructor = Symbol();

	function ObjectModel(def, params) {
		let model = function (obj = model.default) {
			let instance = this;
			if (!is(model, instance)) return new model(obj)
			if (is(model, obj)) return obj

			merge(instance, model[_constructor](obj), true);
			if (!model.validate(instance)) return
			return getProxy(model, instance, model.definition)
		};

		Object.assign(model, params);
		extend(model, Object);
		setConstructor(model, ObjectModel);
		initModel(model, def);
		return model
	}

	extend(ObjectModel, Model, {
		sealed: false,

		defaults(p){
			Object.assign(this.prototype, p);
			return this
		},

		toString(stack){
			return format(this.definition, stack)
		},

		extend(...newParts){
			let parent = this,
			    def = Object.assign({}, this.definition),
			    newAssertions = [],
			    proto = {};

			merge(proto, parent.prototype, false);

			for (let part of newParts) {
				if (is(Model, part)) {
					merge(def, part.definition, true);
					newAssertions.push(...part.assertions);
				}
				if (isFunction(part)) merge(proto, part.prototype, true);
				if (isObject(part)) merge(def, part, true);
			}

			let submodel = extendModel(new ObjectModel(def), parent, proto);
			submodel.assertions = parent.assertions.concat(newAssertions);

			if(getProto(parent) !== ObjectModel.prototype) { // extended class
				submodel[_constructor] = (obj) => {
					let parentInstance = new parent(obj);
					merge(obj, parentInstance, true); // get modified props from parent class constructor
					return obj
				};
			}

			return submodel
		},

		[_constructor]: o => o,

		[_validate](obj, path, errors, stack){
			if (isObject(obj)){
				let def = this.definition;
				checkDefinition(obj, def, path, errors, stack);
				if(this.sealed) checkUndeclaredProps(obj, def, errors);
			}
			else stackError(errors, this, obj, path);

			checkAssertions(obj, this, path, errors);
		}
	});

	let cannot = (msg, model) => {
		model.errors.push({ message: "cannot " + msg });
	};

	let getProxy = (model, obj, def, path) => !isPlainObject(def) ? cast(obj, def) : proxify(obj, {

		getPrototypeOf: () => path ? Object.prototype : getProto(obj),

		get(o, key) {
			if (!isString(key))
				return Reflect.get(o, key)

			let newPath = formatPath(path, key),
			    defPart = def[key];

			if (key in def && model.conventionForPrivate(key)) {
				cannot(`access to private property ${newPath}`, model);
				unstackErrors(model);
				return
			}

			if (o[key] && has(o, key) && !isPlainObject(defPart) && !isModelInstance(o[key])) {
				o[key] = cast(o[key], defPart); // cast nested models
			}

			if (isFunction(o[key]) && o[key].bind)
				return o[key].bind(o); // auto-bind methods to original object, so they can access private props

			if(isPlainObject(defPart) && !o[key]){
				o[key] = {}; // null-safe traversal
			}

			return getProxy(model, o[key], defPart, newPath)
		},

		set(o, key, val) {
			return controlMutation(model, def, path, o, key, (newPath) => Reflect.set(o, key, getProxy(model, val, def[key], newPath)))
		},

		deleteProperty(o, key) {
			return controlMutation(model, def, path, o, key, () => Reflect.deleteProperty(o, key))
		},

		defineProperty(o, key, args){
			return controlMutation(model, def, path, o, key, () => Reflect.defineProperty(o, key, args))
		},

		has(o, key){
			return Reflect.has(o, key) && Reflect.has(def, key) && !model.conventionForPrivate(key)
		},

		ownKeys(o){
			return Reflect.ownKeys(o).filter(key => Reflect.has(def, key) && !model.conventionForPrivate(key))
		},

		getOwnPropertyDescriptor(o, key){
			let descriptor;
			if (!model.conventionForPrivate(key)) {
				descriptor = Object.getOwnPropertyDescriptor(def, key);
				if (descriptor !== undefined) descriptor.value = o[key];
			}

			return descriptor
		}
	});

	let controlMutation = (model, def, path, o, key, applyMutation) => {
		let newPath       = formatPath(path, key),
		    isPrivate     = model.conventionForPrivate(key),
		    isConstant    = model.conventionForConstant(key),
		    isOwnProperty = has(o, key),
		    initialPropDescriptor = isOwnProperty && Object.getOwnPropertyDescriptor(o, key);

		if (key in def && (isPrivate || (isConstant && o[key] !== undefined)))
			cannot(`modify ${isPrivate ? "private" : "constant"} ${key}`, model);

		let isInDefinition = has(def, key);
		if (isInDefinition || !model.sealed) {
			applyMutation(newPath);
			isInDefinition && checkDefinition(o[key], def[key], newPath, model.errors, []);
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
	};

	let checkUndeclaredProps = (obj, def, errors, path) => {
		mapProps(obj, key => {
			let val = obj[key],
			    subpath = formatPath(path, key);
			if(!has(def, key)) rejectUndeclaredProp(subpath, val, errors);
			else if(isPlainObject(val))	checkUndeclaredProps(val, def[key], errors, subpath);
		});
	};

	let rejectUndeclaredProp = (path, received, errors) => {
		errors.push({
			path,
			received,
			message: `property ${path} is not declared in the sealed model definition`
		});
	};

	let styles = {
		list: `list-style-type: none; padding: 0; margin: 0;`,
		listItem: `padding: 0 0 0 1em;`,
		model: `color: #43a047; font-style: italic`,
		function: `color: #4271ae`,
		string: `color: #C41A16`,
		number: `color: #1C00CF`,
		boolean: `color: #AA0D91`,
		property: `color: #881391`,
		private: `color: #B871BD`,
		null: `color: #808080`
	};

	let getModel = (instance) => {
		if (instance === undefined || instance === null)
			return null

		let proto = getProto(instance);
		if (!proto || !proto.constructor || !is(Model, proto.constructor))
			return null

		return proto.constructor
	};

	let span = (value, style) => ["span", {style}, value];

	let format$1 = (x, config) => {
		if (x === null || x === undefined)
			return span(String(x), styles.null);

		if (typeof x === "boolean")
			return span(x, styles.boolean);

		if (typeof x === "number")
			return span(x, styles.number);

		if (typeof x === "string")
			return span(`"${x}"`, styles.string);

		if (isArray(x)) {
			let def = [];
			if (x.length === 1) x.push(undefined, null);
			for (let i = 0; i < x.length; i++) {
				def.push(format$1(x[i]));
				if (i < x.length - 1) def.push(' or ');
			}
			return span(...def)
		}

		if (isPlainObject(x))
			return formatObject(x, getModel(x), config)

		if (isFunction(x) && !is(Model, x))
			return span(x.name || x.toString(), styles.function);

		return x ? ['object', {object: x, config}] : null
	};

	let formatObject = (o, model, config) => {
		return [
			'ol', {style: styles.list},
			'{',
			...mapProps(o, prop => {
				let isPrivate = model && model.conventionForPrivate(prop);
				return ['li', {style: styles.listItem},
					span(prop, isPrivate ? styles.private : styles.property), ': ',
					format$1(o[prop], config)
				]
			}),
			'}'
		];
	};

	let formatHeader = (x, config) => {
		if (is(Model, x))
			return span(getProto(x).name, styles.model)

		if (config.fromModel || isPlainObject(x) || isArray(x))
			return format$1(x)

		return null;
	};

	let ModelFormatter = {
		header(x, config = {}) {
			if (config.fromModel || is(Model, x))
				return formatHeader(x, config);

			return null;
		},
		hasBody(x) {
			return is(Model, x)
		},
		body(x) {
			return format$1(x.definition, {fromModel: true})
		}
	};

	let ModelInstanceFormatter = {
		header(x, config = {}) {
			if (config.fromInstance && isPlainObject(x)) {
				return formatHeader(x, config)
			}

			let model = getModel(x);
			if (is(Model, model)) {
				return span(model.name, styles.model)
			}

			return null;
		},
		hasBody(x) {
			return x && is(ObjectModel, getModel(x))
		},
		body(x) {
			return formatObject(x, getModel(x), {fromInstance: true})
		}
	};

	if (typeof window !== "undefined") {
		window.devtoolsFormatters = (window.devtoolsFormatters || [])
			.concat(ModelFormatter, ModelInstanceFormatter);
	}

	let ARRAY_MUTATORS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];

	function ArrayModel(def) {

		let model = function (array = model.default) {
			if (model.validate(array)) return proxifyModel(array, model, {
				get(arr, key) {
					let val = arr[key];
					return isFunction(val) ? proxifyFn(val, (fn, ctx, args) => {
						if (ARRAY_MUTATORS.includes(key)) {
							let testArray = arr.slice();
							fn.apply(testArray, args);
							model.validate(testArray);
						}

						let returnValue = fn.apply(arr, args);
						array.forEach((a, i) => arr[i] = cast(a, model.definition));
						return returnValue
					}) : val
				},

				set(arr, key, val) {
					return setArrayKey(arr, key, val, model)
				},

				deleteProperty(arr, key){
					return !(key in arr) || setArrayKey(arr, key, undefined, model)
				}
			})
		};

		extend(model, Array);
		setConstructor(model, ArrayModel);
		initModel(model, def);
		return model
	}

	extend(ArrayModel, Model, {
		toString(stack){
			return 'Array of ' + formatDefinition(this.definition, stack)
		},

		[_validate](arr, path, errors, stack){
			if (isArray(arr))
				arr.forEach((a, i) => {
					arr[i] = checkDefinition(a, this.definition, `${path || "Array"}[${i}]`, errors, stack);
				});
			else stackError(errors, this, arr, path);

			checkAssertions(arr, this, path, errors);
		},

		extend(...newParts){
			return extendModel(new ArrayModel(extendDefinition(this.definition, newParts)), this)
		}
	});

	let setArrayKey = (array, key, value, model) => {
		let path = `Array[${key}]`;
		if (parseInt(key) === +key && key >= 0)
			value = checkDefinition(value, model.definition, path, model.errors, []);

		let testArray = array.slice();
		testArray[key] = value;
		checkAssertions(testArray, model, path);
		let isSuccess = !unstackErrors(model);
		if (isSuccess) array[key] = value;
		return isSuccess
	};

	function FunctionModel(...argsDef) {

		let model = function (fn = model.default) {
			if (!model.validate(fn)) return
			return proxifyModel(fn, model, {
				apply (fn, ctx, args) {
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
		initModel(model, {arguments: argsDef});

		return model
	}

	extend(FunctionModel, Model, {
		toString(stack = []){
			let out = `Function(${this.definition.arguments.map(
			argDef => formatDefinition(argDef, stack.slice())
		).join(",")})`;

			if ("return" in this.definition) {
				out += " => " + formatDefinition(this.definition.return, stack);
			}
			return out
		},

		return(def){
			this.definition.return = def;
			return this
		},

		extend(newArgs, newReturns) {
			let args = this.definition.arguments,
			    mixedArgs = newArgs.map((a, i) => extendDefinition(i in args ? args[i] : [], newArgs[i])),
			    mixedReturns = extendDefinition(this.definition.return, newReturns);
			return extendModel(new FunctionModel(...mixedArgs).return(mixedReturns), this)
		},

		[_validate](f, path, errors){
			if (!isFunction(f)) {
				stackError(errors, "Function", f, path);
			}
		}
	});

	FunctionModel.prototype.assert(function (args) {
		return (args.length > this.definition.arguments.length) ? args : true
	}, function (args) {
		return `expecting ${this.definition.arguments.length} arguments for ${format(this)}, got ${args.length}`
	});

	let MAP_MUTATORS = ["set", "delete", "clear"];

	function MapModel(key, value) {

		let model = function (iterable = model.default) {
			let castKeyValue = pair => ["key", "value"].map((prop, i) => cast(pair[i], model.definition[prop])),
			    map = new Map([...iterable].map(castKeyValue));

			if (!model.validate(map)) return

			return proxifyModel(map, model, {
				get(map, key) {
					let val = map[key];
					return isFunction(val) ? proxifyFn(val, (fn, ctx, args) => {
						if (key === "set") {
							args = castKeyValue(args);
						}

						if (MAP_MUTATORS.includes(key)) {
							let testMap = new Map(map);
							fn.apply(testMap, args);
							model.validate(testMap);
						}

						return fn.apply(map, args)
					}) : val
				}
			})
		};

		extend(model, Map);
		setConstructor(model, MapModel);
		initModel(model, {key, value});
		return model
	}

	extend(MapModel, Model, {
		toString(stack) {
			let {key, value} = this.definition;
			return `Map of ${formatDefinition(key, stack)} : ${formatDefinition(value, stack)}`
		},

		[_validate](map, path, errors, stack) {
			if (map instanceof Map) {
				path = path || 'Map';
				for (let [key, value] of map) {
					checkDefinition(key, this.definition.key, `${path} key`, errors, stack);
					checkDefinition(value, this.definition.value, `${path}[${format(key)}]`, errors, stack);
				}
			} else stackError(errors, this, map, path);

			checkAssertions(map, this, path, errors);
		},

		extend(keyPart, valuePart){
			let {key, value} = this.definition;
			return extendModel(new MapModel(extendDefinition(key, keyPart), extendDefinition(value, valuePart)), this)
		}
	});

	let SET_MUTATORS = ["add", "delete", "clear"];

	function SetModel(def) {

		let model = function (iterable = model.default) {
			let castValue = val => cast(val, model.definition),
			    set = new Set([...iterable].map(castValue));

			if (!model.validate(set)) return

			return proxifyModel(set, model, {
				get(set, key) {
					let val = set[key];
					return isFunction(val) ? proxifyFn(val, (fn, ctx, args) => {
						if (key === "add") {
							args[0] = castValue(args[0]);
						}

						if (SET_MUTATORS.includes(key)) {
							let testSet = new Set(set);
							fn.apply(testSet, args);
							model.validate(testSet);
						}

						return fn.apply(set, args)
					}) : val
				}
			})
		};

		extend(model, Set);
		setConstructor(model, SetModel);
		initModel(model, def);
		return model
	}

	extend(SetModel, Model, {
		toString(stack){
			return "Set of " + formatDefinition(this.definition, stack)
		},

		[_validate](set, path, errors, stack){
			if (set instanceof Set) {
				for (let item of set.values()) {
					checkDefinition(item, this.definition, `${path || "Set"} value`, errors, stack);
				}
			} else stackError(errors, this, set, path);
			checkAssertions(set, this, path, errors);
		},

		extend(...newParts){
			return extendModel(new SetModel(extendDefinition(this.definition, newParts)), this)
		}
	});

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
