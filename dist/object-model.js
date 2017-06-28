/*!
 * Objectmodel v3.0.0
 * http://objectmodel.js.org
 *
 * Copyright (c) 2017 Sylvain Pollet-Villard
 * Licensed under the MIT license
 */

(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.window = global.window || {})));
}(this, (function (exports) { 'use strict';

const getProto        = Object.getPrototypeOf;
const is              = (Constructor, obj) => obj instanceof Constructor;
const isString        = s => typeof s === "string";
const isFunction      = f => typeof f === "function";
const isObject        = o => typeof o === "object";
const isArray         = a => Array.isArray(a);
const isPlainObject   = o => o && isObject(o) && getProto(o) === Object.prototype;
const isModelInstance = i => i && is(Model, getProto(i).constructor);
const bettertypeof    = x => ({}).toString.call(x).match(/\s([a-zA-Z]+)/)[1];

const proxify      = (val, traps) => new Proxy(val, traps);
const proxifyFn    = (fn, apply) => proxify(fn, {apply});
const proxifyModel = (val, model, traps) => proxify(val, Object.assign({
	getPrototypeOf: () => model.prototype
}, traps));

function merge(target, src = {}, deep, includingProto) {
	for (let key in src) {
		if (includingProto || src.hasOwnProperty(key)) {
			if (deep && isPlainObject(src[key])) {
				const o = {};
				merge(o, target[key], deep);
				merge(o, src[key], deep);
				target[key] = o;
			} else {
				target[key] = src[key];
			}
		}
	}
}

function define(obj, key, value, enumerable = false) {
	Object.defineProperty(obj, key, {value, enumerable, writable: true, configurable: true});
}

function setConstructor(model, constructor) {
	Object.setPrototypeOf(model, constructor.prototype);
	define(model, "constructor", constructor);
}

function extend(child, parent, props) {
	child.prototype = Object.assign(Object.create(parent.prototype, {
		constructor: {
			value: child,
			writable: true,
			configurable: true
		}
	}), props);
	Object.setPrototypeOf(child, parent);
}

function format$1(obj, stack = []) {
	if (stack.length > 15 || stack.includes(obj)) return '...'
	if (obj === null || obj === undefined) return String(obj)
	if (isString(obj)) return `"${obj}"`
	if (is(Model, obj)) return obj.toString(stack)

	stack.unshift(obj);

	if (isFunction(obj)) return obj.name || obj.toString(stack)
	if (is(Map, obj) || is(Set, obj)) return format$1([...obj])
	if (isArray(obj)) return `[${obj.map(item => format$1(item, stack)).join(', ')}]`
	if (obj.toString !== Object.prototype.toString) return obj.toString()
	if (obj && isObject(obj)) {
		const props  = Object.keys(obj),
		      indent = '\t'.repeat(stack.length);
		return `{${props.map(
			key => `\n${indent + key}: ${format$1(obj[key], stack.slice())}`
		).join(',')} ${props.length ? `\n${indent.slice(1)}` : ''}}`
	}

	return String(obj)
}

const _constructor = "_constructor";
const _validate = "_validate";

function parseDefinition(def) {
	if (isPlainObject(def)) {
		for (let key of Object.keys(def)) {
			def[key] = parseDefinition(def[key]);
		}
	}
	else if (!isArray(def)) return [def]
	else if (def.length === 1) return [...def, undefined, null]

	return def
}

const formatDefinition = (def, stack) => parseDefinition(def).map(d => format$1(d, stack)).join(" or ");

function extendDefinition(def, newParts = []) {
	if (!isArray(newParts)) newParts = [newParts];
	if (newParts.length > 0) {
		def = newParts
			.reduce((def, ext) => def.concat(ext), isArray(def) ? def.slice() : [def]) // clone to lose ref
			.filter((value, index, self) => self.indexOf(value) === index); // remove duplicates
	}

	return def
}

function checkDefinition(obj, def, path, errors, stack, shouldCast = false) {
	const indexFound = stack.indexOf(def);
	if (indexFound !== -1 && stack.indexOf(def, indexFound + 1) !== -1)
		return obj //if found twice in call stack, cycle detected, skip validation

	if (shouldCast)
		obj = cast(obj, def);

	if (is(Model, def)) {
		def[_validate](obj, path, errors, stack.concat(def));
	}
	else if (isPlainObject(def)) {
		Object.keys(def).forEach(key => {
			const val = obj != null ? obj[key] : undefined;
			checkDefinition(val, def[key], path ? path + '.' + key : key, errors, stack);
		});
	}
	else {
		const pdef = parseDefinition(def);
		if (pdef.some(part => checkDefinitionPart(obj, part, path, stack)))
			return obj

		stackError(errors, def, obj, path);
	}

	return obj
}

function checkDefinitionPart(obj, def, path, stack) {
	if (obj == null) return obj === def
	if (isPlainObject(def) || is(Model, def)) { // object or model as part of union type
		const errors = [];
		checkDefinition(obj, def, path, errors, stack);
		return !errors.length
	}
	if (is(RegExp, def)) return def.test(obj)
	if (def === Number || def === Date) return obj.constructor === def && !isNaN(obj)
	return obj === def
		|| (isFunction(def) && is(def, obj))
		|| obj.constructor === def
}

function checkAssertions(obj, model, path, errors = model.errors) {
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
				+`for ${path ? path+" =" : "value"} ${format$1(value)}`;
			stackError(errors, assertion, obj, path, onFail.call(model, result, obj, path));
		}
	}
}

function cast(obj, defNode = []) {
	if (!obj || isPlainObject(defNode) || isModelInstance(obj))
		return obj // no value or not leaf or already a model instance

	const def = parseDefinition(defNode);
	const suitableModels = [];

	for (let part of def) {
		if (is(Model, part) && part.test(obj))
			suitableModels.push(part);
	}

	if (suitableModels.length === 1) {
		// automatically cast to suitable model when explicit
		const model = suitableModels[0];
		return is(Model, model) ? model(obj) : new model(obj) // basic models should not be called with new
	}

	if (suitableModels.length > 1)
		console.warn(`Ambiguous model for value ${format$1(obj)}, could be ${suitableModels.join(" or ")}`);

	return obj
}

function BasicModel(def) {
	const model = function (val = model.default) {
		if (!model.validate(val)) return
		return val
	};

	setConstructor(model, BasicModel);
	initModel(model, def);
	return model
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

function Model(def) {
	return isPlainObject(def) ? new ObjectModel(def) : new BasicModel(def)
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

	[_constructor]: o => o,

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

	assert(assertion, description = format$1(assertion)){
		define(assertion, "description", description);
		this.assertions = this.assertions.concat(assertion);
		return this
	}
});

function initModel(model, def) {
	model.definition = def;
	model.assertions = [...model.assertions];
	define(model, "errors", []);
	delete model.name;
}

function extendModel(child, parent, newProps) {
	extend(child, parent, newProps);
	child.assertions.push(...parent.assertions);
	return child
}

function stackError(errors, expected, received, path, message) {
	errors.push({expected, received, path, message});
}

function unstackErrors(model, errorCollector = model.errorCollector) {
	const nbErrors = model.errors.length;
	if (nbErrors > 0) {
		const errors = model.errors.map(err => {
			if (!err.message) {
				const def   = isArray(err.expected) ? err.expected : [err.expected];
				err.message = "expecting " + (err.path ? err.path + " to be " : "") + def.map(d => format$1(d)).join(" or ")
					+ ", got " + (err.received != null ? bettertypeof(err.received) + " " : "") + format$1(err.received);
			}
			return err
		});
		model.errors = [];
		errorCollector.call(model, errors); // throw all errors collected
	}
	return nbErrors
}

const cannot = (model, msg) => {
	model.errors.push({message: "cannot " + msg});
};

function ObjectModel(def) {
	const model = function (obj = model.default) {
		let instance = this;
		if (!is(model, instance)) return new model(obj)
		if (is(model, obj)) return obj
		merge(instance, model[_constructor](obj), true);
		if (!model.validate(instance)) return
		return getProxy(model, instance, model.definition)
	};

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
		return format$1(this.definition, stack)
	},

	extend(...newParts){
		const parent = this;
		const def = Object.assign({}, this.definition);
		const newAssertions = [];

		const proto = {};
		merge(proto, parent.prototype, false, true);

		for (let part of newParts) {
			if (is(Model, part)) {
				merge(def, part.definition, true);
				newAssertions.push(...part.assertions);
			}
			if (isFunction(part)) merge(proto, part.prototype, true, true);
			if (isObject(part)) merge(def, part, true, true);
		}

		let submodel = extendModel(new ObjectModel(def), parent, proto);
		submodel.assertions = parent.assertions.concat(newAssertions);

		if(getProto(parent) !== ObjectModel.prototype) { // extended class
			submodel[_constructor] = function(obj){
				let parentInstance = new parent(obj);
				merge(obj, parentInstance, true); // get modified props from parent class constructor
				return obj
			};
		}

		return submodel
	},

	[_validate](obj, path, errors, stack){
		if (isObject(obj)) checkDefinition(obj, this.definition, path, errors, stack);
		else stackError(errors, this, obj, path);

		checkAssertions(obj, this, path, errors);
	}
});

function getProxy(model, obj, def, path) {
	if (!isPlainObject(def))
		return cast(obj, def)

	return proxify(obj || {}, {
		getPrototypeOf: () => path ? Object.prototype : getProto(obj),

		get(o, key) {
			if (!isString(key))
				return Reflect.get(o, key)

			const newPath = (path ? path + '.' + key : key),
			      defPart = def[key];

			if (key in def && model.conventionForPrivate(key)) {
				cannot(model, `access to private property ${newPath}`);
				unstackErrors(model);
				return
			}

			if (o[key] && o.hasOwnProperty(key) && !isPlainObject(defPart) && !isModelInstance(o[key])) {
				o[key] = cast(o[key], defPart); // cast nested models
			}

			if (isFunction(o[key]) && o[key].bind) {
				return o[key].bind(o); // auto-bind methods to original object, so they can access private props
			}

			return getProxy(model, o[key], defPart, newPath)
		},

		set(o, key, val) {
			return controlMutation(model, def, path, o, key, (newPath) => {
				Reflect.set(o, key, getProxy(model, val, def[key], newPath));
			})
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

		ownKeys(){
			return Reflect.ownKeys(def).filter(key => !model.conventionForPrivate(key))
		},

		getOwnPropertyDescriptor(o, key){
			let descriptor;
			if (!model.conventionForPrivate(key)) {
				descriptor = Object.getOwnPropertyDescriptor(def, key);
				if (descriptor !== undefined) descriptor.value = o[key];
			}

			return descriptor
		}
	})
}

function controlMutation(model, def, path, o, key, applyMutation) {
	const newPath       = (path ? path + '.' + key : key),
	      isPrivate     = model.conventionForPrivate(key),
	      isConstant    = model.conventionForConstant(key),
	      isOwnProperty = o.hasOwnProperty(key);

	const initialPropDescriptor = isOwnProperty && Object.getOwnPropertyDescriptor(o, key);

	if (key in def && (isPrivate || (isConstant && o[key] !== undefined)))
		cannot(model, `modify ${isPrivate ? "private" : "constant"} ${key}`);

	const isInDefinition = def.hasOwnProperty(key);
	if (isInDefinition || !model.sealed) {
		applyMutation(newPath);
		isInDefinition && checkDefinition(o[key], def[key], newPath, model.errors, []);
		checkAssertions(o, model, newPath);
	}
	else cannot(model, `find property ${newPath} in the model definition`);

	if (model.errors.length) {
		if (isOwnProperty) Object.defineProperty(o, key, initialPropDescriptor);
		else delete o[key]; // back to the initial property defined in prototype chain

		unstackErrors(model);
		return false
	}

	return true
}

const styles = {
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

function getModel(instance) {
	if (instance === undefined || instance === null)
		return null

	const proto = getProto(instance);
	if (!proto || !proto.constructor || !is(Model, proto.constructor))
		return null

	return proto.constructor
}

const span = (value, style) => ["span", {style}, value];

function format(x, config) {
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
			def.push(format(x[i]));
			if (i < x.length - 1) def.push(' or ');
		}
		return span(...def)
	}

	if (isPlainObject(x))
		return formatObject(x, getModel(x), config)

	if (isFunction(x) && !is(Model, x))
		return span(x.name || x.toString(), styles.function);

	return x ? ['object', {object: x, config}] : null
}

function formatObject(o, model, config) {
	return [
		'ol', {style: styles.list},
		'{',
		...Object.keys(o).map(prop => {
			let isPrivate = model && model.conventionForPrivate(prop);
			return ['li', {style: styles.listItem},
				span(prop, isPrivate ? styles.private : styles.property), ': ',
				format(o[prop], config)
			]
		}),
		'}'
	];
}

function formatHeader(x, config) {
	if (is(Model, x))
		return span(x.name, styles.model)

	if (config.fromModel || isPlainObject(x) || isArray(x))
		return format(x)

	return null;
}

const ModelFormatter = {
	header(x, config = {}) {
		if (config.fromModel || is(Model, x))
			return formatHeader(x, config);

		return null;
	},
	hasBody(x) {
		return is(Model, x)
	},
	body(x) {
		return format(x.definition, {fromModel: true})
	}
};

const ModelInstanceFormatter = {
	header(x, config = {}) {
		if (config.fromInstance && isPlainObject(x)) {
			return formatHeader(x, config)
		}

		const model = getModel(x);
		if (is(Model, model)) {
			return span(x.constructor.name, styles.model)
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

const ARRAY_MUTATORS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];

function ArrayModel(def) {

	const model = function (array = model.default) {
		if (!model.validate(array)) return
		return proxifyModel(array, model, {
			get(arr, key) {
				let val = arr[key];
				if (!isFunction(val)) return val

				return proxifyFn(val, (fn, ctx, args) => {
					if (ARRAY_MUTATORS.includes(key)) {
						const testArray = arr.slice();
						fn.apply(testArray, args);
						model.validate(testArray);
					}

					const returnValue = fn.apply(arr, args);
					array.forEach((a, i) => arr[i] = cast(a, model.definition));
					return returnValue
				})
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
				arr[i] = checkDefinition(a, this.definition, `${path || "Array"}[${i}]`, errors, stack, true);
			});
		else stackError(errors, this, arr, path);

		checkAssertions(arr, this, path, errors);
	},

	extend(...newParts){
		return extendModel(new ArrayModel(extendDefinition(this.definition, newParts)), this)
	}
});

function setArrayKey(array, key, value, model) {
	let path = `Array[${key}]`;
	if (parseInt(key) === +key && key >= 0)
		value = checkDefinition(value, model.definition, path, model.errors, [], true);

	const testArray = array.slice();
	testArray[key] = value;
	checkAssertions(testArray, model, path);
	const isSuccess = !unstackErrors(model);
	if (isSuccess) array[key] = value;
	return isSuccess
}

function FunctionModel(...argsDef) {

	const model = function (fn = model.default) {
		if (!model.validate(fn)) return
		return proxifyModel(fn, model, {
			apply (fn, ctx, args) {
				const def = model.definition;

				def.arguments.forEach((argDef, i) => {
					args[i] = checkDefinition(args[i], argDef, `arguments[${i}]`, model.errors, [], true);
				});

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
		const args = this.definition.arguments;
		const mixedArgs = newArgs.map((a, i) => extendDefinition(i in args ? args[i] : [], newArgs[i]));
		const mixedReturns = extendDefinition(this.definition.return, newReturns);
		return extendModel(new FunctionModel(...mixedArgs).return(mixedReturns), this)
	},

	[_validate](f, path, errors){
		if (!isFunction(f)) {
			stackError(errors, "Function", f, path);
		}
	}
});

FunctionModel.prototype.assert(function (args) {
	if (args.length > this.definition.arguments.length) return args
	return true
}, function (args) {
	return `expecting ${this.definition.arguments.length} arguments for ${format$1(this)}, got ${args.length}`
});

const MAP_MUTATORS = ["set", "delete", "clear"];

function MapModel(key, value) {

	const model = function (iterable = model.default) {
		const castKeyValue = pair => ["key", "value"].map((prop, i) => cast(pair[i], model.definition[prop]));
		const map          = new Map([...iterable].map(castKeyValue));

		if (!model.validate(map)) return

		return proxifyModel(map, model, {
			get(map, key) {
				let val = map[key];
				if (!isFunction(val)) return val

				return proxifyFn(val, (fn, ctx, args) => {
					if (key === "set") {
						args = castKeyValue(args);
					}

					if (MAP_MUTATORS.includes(key)) {
						const testMap = new Map(map);
						fn.apply(testMap, args);
						model.validate(testMap);
					}

					return fn.apply(map, args)
				})
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
		const {key, value} = this.definition;
		return `Map of ${formatDefinition(key, stack)} : ${formatDefinition(value, stack)}`
	},

	[_validate](map, path, errors, stack) {
		if (map instanceof Map) {
			path = path || 'Map';
			for (let [key, value] of map) {
				checkDefinition(key, this.definition.key, `${path} key`, errors, stack);
				checkDefinition(value, this.definition.value, `${path}[${format$1(key)}]`, errors, stack);
			}
		} else stackError(errors, this, map, path);

		checkAssertions(map, this, path, errors);
	},

	extend(newKeys, newValues){
		const {key, value} = this.definition;
		return extendModel(new MapModel(extendDefinition(key, newKeys), extendDefinition(value, newValues)), this)
	}
});

const SET_MUTATORS = ["add", "delete", "clear"];

function SetModel(def) {

	const model = function (iterable = model.default) {
		const castValue = val => cast(val, model.definition);
		const set       = new Set([...iterable].map(castValue));

		if (!model.validate(set)) return

		return proxifyModel(set, model, {
			get(set, key) {
				let val = set[key];
				if (!isFunction(val)) return val;

				return proxifyFn(val, (fn, ctx, args) => {
					if (key === "add") {
						args[0] = castValue(args[0]);
					}

					if (SET_MUTATORS.includes(key)) {
						const testSet = new Set(set);
						fn.apply(testSet, args);
						model.validate(testSet);
					}

					return fn.apply(set, args)
				})
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
