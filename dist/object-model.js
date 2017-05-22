/*!
 * Objectmodel v3.0.0
 * http://objectmodel.js.org
 *
 * Copyright (c) 2017 Sylvain Pollet-Villard
 * Licensed under the MIT license
 */

(function (exports) {
'use strict';

const defineProperty = Object.defineProperty;

function is(Constructor, obj){
	return obj instanceof Constructor
}

function isFunction(o){
	return typeof o === "function"
}

function isObject(o){
    return typeof o === "object"
}

function isPlainObject(o){
	return o && isObject(o) && Object.getPrototypeOf(o) === Object.prototype
}

function bettertypeof(x){
	return ({}).toString.call(x).match(/\s([a-zA-Z]+)/)[1]
}

function merge(target, src={}, deep, includingProto) {
	for(let key in src){
		if(includingProto || src.hasOwnProperty(key)){
			if(deep && isPlainObject(src[key])){
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

function define(obj, key, value, enumerable=false) {
	defineProperty(obj, key, { value, enumerable, writable: true, configurable: true });
}

function setConstructor(model, constructor){
	Object.setPrototypeOf(model, constructor.prototype);
	define(model, "constructor", constructor);
}

function setConstructorProto(constructor, proto){
	constructor.prototype = Object.create(proto);
	constructor.prototype.constructor = constructor;
}

function toString(obj, stack = []){
	if(stack.length > 15 || stack.includes(obj)) return '...'
	if(obj === null || obj === undefined) return String(obj)
	if(typeof obj === "string") return `"${obj}"`
	if(is(Model, obj)) return obj.toString(stack)
	stack = [obj].concat(stack);
	if(isFunction(obj)) return obj.name || obj.toString(stack)
	if(is(Array, obj)) return `[${obj.map(item => toString(item, stack)).join(', ')}]`
	if(obj.toString !== Object.prototype.toString) return obj.toString()
	if(obj && isObject(obj)) {
		const props = Object.keys(obj),
			  indent = '\t'.repeat(stack.length);
		return `{${props.map(
			key => `\n${indent+key}: ${toString(obj[key], stack)}`
		).join(',')} ${props.length ? `\n${indent.slice(1)}` : ''}}`
	}
	return String(obj)
}

function parseDefinition(def){
	if(!isPlainObject(def)){
		if(!is(Array, def)) return [def]
		if(def.length === 1) return [...def, undefined, null]
	} else {
		for(let key of Object.keys(def))
			def[key] = parseDefinition(def[key]);
	}
	return def
}


function checkDefinition(obj, def, path, errorStack, callStack, shouldCast=false){
	const indexFound = callStack.indexOf(def);
	if(indexFound !== -1 && callStack.indexOf(def, indexFound+1) !== -1)
		return obj //if found twice in call stack, cycle detected, skip validation

	if(shouldCast)
		obj = cast(obj, def);


	if(is(Model, def)){
		def._validate(obj, path, errorStack, callStack.concat(def));
	}
	else if(isPlainObject(def)){
		Object.keys(def).forEach(key => {
			const val = obj != null ? obj[key] : undefined;
			checkDefinition(val, def[key], path ? path + '.' + key : key, errorStack, callStack);
		});
	}
	else {
		const pdef = parseDefinition(def);
		if(pdef.some(part => checkDefinitionPart(obj, part, path, callStack)))
			return obj

		errorStack.push({
			expected: def,
			received: obj,
			path
		});
	}

	return obj
}

function checkDefinitionPart(obj, def, path, callStack){
	if(obj == null) return obj === def
	if(isPlainObject(def) || is(Model, def)){ // object or model as part of union type
		const errorStack = [];
		checkDefinition(obj, def, path, errorStack, callStack);
		return !errorStack.length
	}
	if(is(RegExp, def)) return def.test(obj)
	if(def === Number || def === Date) return obj.constructor === def && !isNaN(obj)
	return obj === def
		|| (isFunction(def) && is(def, obj))
		|| obj.constructor === def
}


function checkAssertions(obj, model, path, errorStack = model.errorStack){
	for(let assertion of model.assertions){
		let result;
		try {
			result = assertion.call(model, obj);
		} catch(err){
			result = err;
		}
		if(result !== true){
			const onFail = isFunction(assertion.description) ? assertion.description : (assertionResult, value) =>
				`assertion "${assertion.description}" returned ${toString(assertionResult)} for value ${toString(value)}`;
			errorStack.push({
				message: onFail.call(model, result, obj),
				expected: assertion,
				received: obj,
				path
			});
		}
	}
}

function cast(obj, defNode=[]) {
	if(!obj || isPlainObject(defNode) || is(Model, obj.constructor))
		return obj // no value or not leaf or already a model instance

	const def = parseDefinition(defNode),
	      suitableModels = [];

	for (let part of def) {
		if(is(Model, part) && part.test(obj))
			suitableModels.push(part);
	}

	if (suitableModels.length === 1) {
		// automatically cast to suitable model when explicit
		const model = suitableModels[0];
		return is(Model, model) ? model(obj) : new model(obj) // basic models should not be called with new
	}

	if (suitableModels.length > 1)
		console.warn(`Ambiguous model for value ${toString(obj)}, could be ${suitableModels.join(" or ")}`);

	return obj
}

function BasicModel(def){
	const model = function(val = model.default) {
		model.validate(val);
		return val
	};

	initModel(model, arguments, BasicModel);
	return model
}

setConstructorProto(BasicModel, Model.prototype);

function ObjectModel(def){
	const model = function(obj = model.default) {
		if(!is(model, this)) return new model(obj)
		if(is(model, obj)) return obj
		merge(this, obj, true);
		if(model.hasOwnProperty("constructor")){
			model.constructor.call(this, obj);
		}
		model.validate(this);
		return getProxy(model, this, model.definition)
	};

	setConstructorProto(model, Object.prototype);
	initModel(model, arguments, ObjectModel);
	return model
}

setConstructorProto(ObjectModel, Model.prototype);

Object.assign(ObjectModel.prototype, {

	defaults(p){
		Object.assign(this.prototype, p);
		return this
	},

	toString(stack){
		return toString(this.definition, stack)
	},

	extend(){
		const def = {};
		const proto = {};
		const args = [...arguments];

		Object.assign(def, this.definition);
		merge(proto, this.prototype, false, true);
		args.forEach(arg => {
			if(is(Model, arg)) merge(def, arg.definition, true);
			if(isFunction(arg)) merge(proto, arg.prototype, true, true);
			if(isObject(arg)) merge(def, arg, true, true);
		});
		delete proto.constructor;

		let assertions = [...this.assertions];
		args.forEach(arg => {
			if(is(Model, arg)) assertions = assertions.concat(arg.assertions);
		});

		const submodel = new this.constructor(def);
		setConstructorProto(submodel, this.prototype);
		Object.assign(submodel.prototype, proto);
		submodel.assertions = assertions;
		submodel.errorCollector = this.errorCollector;
		return submodel
	},

	_validate(obj, path, errorStack, callStack){
		if(!isObject(obj)){
			errorStack.push({
				expected: this,
				received: obj,
				path
			});
		} else {
			checkDefinition(obj, this.definition, path, errorStack, callStack);
		}
		checkAssertions(obj, this, path, errorStack);
	}
});

function getProxy(model, obj, def, path) {
	if(!isPlainObject(def)) {
		return cast(obj, def)
	}

	return new Proxy(obj || {}, {
		getPrototypeOf(){
			if (def === model.definition)
				return model.prototype

			return Object.prototype
		},

		get(o, key) {
			const newPath = (path ? path + '.' + key : key),
			      defPart = def[key];

			if(key in def && model.conventionForPrivate(key)){
				model.errorStack.push({
					message: `cannot access to private property ${newPath}`
				});
				model.unstackErrors();
				return
			}

			if(o[key] && o.hasOwnProperty(key) && !isPlainObject(defPart) && !is(Model, o[key].constructor)){
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
			if(!model.conventionForPrivate(key)){
				descriptor = Object.getOwnPropertyDescriptor(def, key);
				if(descriptor !== undefined) descriptor.value = o[key];
			}

			return descriptor
		}
	})
}

function controlMutation(model, def, path, o, key, applyMutation){
	const newPath = (path ? path + '.' + key : key),
	      isPrivate = model.conventionForPrivate(key),
	      isConstant = model.conventionForConstant(key),
	      isOwnProperty = o.hasOwnProperty(key),
	      initialPropDescriptor = isOwnProperty && Object.getOwnPropertyDescriptor(o, key);

	if(key in def && (isPrivate || (isConstant && o[key] !== undefined))){
		model.errorStack.push({
			message: `cannot modify ${isPrivate ? "private" : "constant"} ${key}`
		});
	}

	if(def.hasOwnProperty(key)){
		applyMutation(newPath);
		checkDefinition(o[key], def[key], newPath, model.errorStack, []);
		checkAssertions(o, model, newPath);
	} else {
		model.errorStack.push({
			message: `cannot find property ${newPath} in the model definition`
		});
	}

	if(model.errorStack.length){
		if(isOwnProperty) Object.defineProperty(o, key, initialPropDescriptor);
		else delete o[key]; // back to the initial property defined in prototype chain

		model.unstackErrors();
		return false
	}

	return true
}

function Model(def){
	return isPlainObject(def) ? ObjectModel(def) : BasicModel(def)
}

Object.assign(Model.prototype, {
	name: "Model",
	assertions: [],

	conventionForConstant: key => key.toUpperCase() === key,
	conventionForPrivate: key => key[0] === "_",

	toString(stack){
		return parseDefinition(this.definition).map(d => toString(d, stack)).join(" or ")
	},

	as(name){
		define(this, "name", name);
		return this
	},

	defaultTo(val){
		this.default = val;
		return this
	},

	_validate(obj, path, errorStack, callStack){
		checkDefinition(obj, this.definition, path, errorStack, callStack);
		checkAssertions(obj, this, path, errorStack);
	},

	validate(obj, errorCollector){
		this._validate(obj, null, this.errorStack, []);
		this.unstackErrors(errorCollector);
	},

	test(obj){
		let failed,
		    initialErrorCollector = this.errorCollector;
		this.errorCollector = () => { failed = true; };
		new this(obj);
		this.errorCollector = initialErrorCollector;
		return !failed
	},

	// throw all errors collected
	unstackErrors(errorCollector){
		if (!this.errorStack.length) return
		if (!errorCollector) errorCollector = this.errorCollector;
		const errors = this.errorStack.map(err => {
			if (!err.message) {
				const def = is(Array, err.expected) ? err.expected : [err.expected];
				err.message = ("expecting " + (err.path ? err.path + " to be " : "") + def.map(d => toString(d)).join(" or ")
				+ ", got " + (err.received != null ? bettertypeof(err.received) + " " : "") + toString(err.received));
			}
			return err
		});
		this.errorStack = [];
		errorCollector.call(this, errors);
	},

	errorCollector(errors){
		let e = new TypeError(errors.map(e => e.message).join('\n'));
		e.stack = e.stack.replace(/\n.*object-model(.|\n)*object-model.*/, ""); // blackbox objectmodel in stacktrace
		throw e
	},

	extend(...newParts){
		let def = this.definition;
		if(newParts.length > 0){
			def = newParts
				.reduce((def, ext) => def.concat(ext), Array.isArray(def) ? def.slice() : [def]) // clone to lose ref
				.filter((value, index, self) => self.indexOf(value) === index); // remove duplicates
		}

		let assertions = [...this.assertions];
		newParts.forEach(part => {
			if(is(BasicModel, part)) assertions = assertions.concat(part.assertions);
		});

		const submodel = new this.constructor(def);
		setConstructorProto(submodel, this.prototype);
		submodel.assertions = assertions;
		submodel.errorCollector = this.errorCollector;
		return submodel
	},

	assert(assertion, description = toString(assertion)){
		define(assertion, "description", description);
		this.assertions = this.assertions.concat(assertion);
		return this
	}
});


function initModel(model, args, constructor){
	if(args.length === 0) throw new Error("Model definition is required");
	setConstructor(model, constructor);
	model.definition = args[0];
	model.assertions = model.assertions.slice();
	define(model, "errorStack", []);
	delete model.name;
}

const MUTATOR_METHODS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];

function ArrayModel(def){

	const model = function(array = model.default) {
		if(!is(model, this)) return new model(array)
		model.validate(array);
		return new Proxy(array, {
			getPrototypeOf: () => model.prototype,

			get(arr, key) {
				if (MUTATOR_METHODS.includes(key)) return proxifyMethod(arr, key, model)
				return arr[key]
			},

			set(arr, key, val) {
				return setArrayKey(arr, key, val, model)
			},

			deleteProperty(arr, key){
				return !(key in arr) || setArrayKey(arr, key, undefined, model)
			}
		})
	};

	setConstructorProto(model, Array.prototype);
	initModel(model, arguments, ArrayModel);
	return model
}

setConstructorProto(ArrayModel, Model.prototype);
Object.assign(ArrayModel.prototype, {

	toString(stack){
		return 'Array of ' + toString(this.definition, stack)
	},

	_validate(arr, path, errorStack, callStack){
		if(is(Array, arr))
			arr.forEach((a,i) => {
				arr[i] = checkDefinition(a, this.definition, `${path || "Array"}[${i}]`, errorStack, callStack, true);
			});
		else errorStack.push({
			expected: this,
			received: arr,
			path
		});

		checkAssertions(arr, this, path, errorStack);
	}
});

function proxifyMethod(array, method, model){
	return function() {
		const testArray = array.slice();
		Array.prototype[method].apply(testArray, arguments);
		model.validate(testArray);
		const returnValue = Array.prototype[method].apply(array, arguments);
		array.forEach((a,i)=> array[i] = cast(a, model.definition));
		return returnValue
	}
}

function setArrayKey(array, key, value, model){
	let path = `Array[${key}]`;
	if(parseInt(key) === +key && key >= 0)
		value = checkDefinition(value, model.definition, path, model.errorStack, [], true);

	const testArray = array.slice();
	testArray[key] = value;
	checkAssertions(testArray, model, path);
	const isSuccess = !model.unstackErrors();
	if(isSuccess){
		array[key] = value;
	}
	return isSuccess
}

function FunctionModel() {

	const model = function(fn = model.default) {
		return new Proxy(fn, {
			getPrototypeOf: () => model.prototype,

			apply (fn, ctx, args) {
				const def = model.definition;

				def.arguments.forEach((argDef, i) => {
					args[i] = checkDefinition(args[i], argDef, `arguments[${i}]`, model.errorStack, [], true);
				});

				checkAssertions(args, model, "arguments");

				let result;
				if(!model.errorStack.length){
					result = Reflect.apply(fn, ctx, args);
					if ("return" in def)
						result = checkDefinition(result, def.return, "return value", model.errorStack, [], true);
				}
				model.unstackErrors();
				return result
			}
		});
	};

	setConstructorProto(model, Function.prototype);

	const def = { arguments: [...arguments] };
	initModel(model, [ def ], FunctionModel);

	return model
}

setConstructorProto(FunctionModel, Model.prototype);

Object.assign(FunctionModel.prototype, {

	toString(stack){
		let out = 'Function(' + this.definition.arguments.map(argDef => toString(argDef, stack)).join(",") +')';
		if("return" in this.definition) {
			out += " => " + toString(this.definition.return);
		}
		return out
	},

	return(def){
		this.definition.return = def;
		return this
	},

	_validate(f, path, errorStack){
		if (!isFunction(f)) {
			errorStack.push({
				expected: "Function",
				received: f,
				path
			});
		}
	}
});

FunctionModel.prototype.assert(function(args){
	if (args.length > this.definition.arguments.length) return args
	return true
}, function(args){
	return `expecting ${this.definition.arguments.length} arguments for ${toString(this)}, got ${args.length}`
});

const MAP_MUTATOR_METHODS = ["set", "delete", "clear"];

function MapModel(def){

	const model = function(iterable) {
		const map = new Map(iterable);
		model.validate(map);

		for(let method of MAP_MUTATOR_METHODS){
			map[method] = function() {
				const testMap = new Map(map);
				Map.prototype[method].apply(testMap, arguments);
				model.validate(testMap);
				return Map.prototype[method].apply(map, arguments)
			};
		}

		setConstructor(map, model);
		return map
	};

	setConstructorProto(model, Map.prototype);
	initModel(model, arguments, MapModel);
	return model
}

setConstructorProto(MapModel, Model.prototype);
Object.assign(MapModel.prototype, {

	toString(stack){
		return "Map of " + toString(this.definition, stack)
	},

	_validate(map, path, errorStack, callStack){
		if(map instanceof Map){
			for(let [key,val] of map){
				checkDefinition(val, this.definition, `${path || "Map"}[${key}]`, errorStack, callStack);
			}
		} else {
			errorStack.push({
				expected: this,
				received: map,
				path
			});
		}
		checkAssertions(map, this, errorStack);
	}
});

const SET_MUTATOR_METHODS = ["add", "delete", "clear"];

function SetModel(def){

	const model = function(iterable) {
		const _set = new Set(iterable);
		model.validate(_set);

		for(let method of SET_MUTATOR_METHODS){
			_set[method] = function() {
				const testSet = new Set(_set);
				Set.prototype[method].apply(testSet, arguments);
				model.validate(testSet);
				return Set.prototype[method].apply(_set, arguments)
			};
		}

		setConstructor(_set, model);
		return _set
	};

	setConstructorProto(model, Set.prototype);
	initModel(model, arguments, SetModel);
	return model
}

setConstructorProto(SetModel, Model.prototype);
Object.assign(SetModel.prototype, {

	toString(stack){
		return "Set of " + toString(this.definition, stack)
	},

	_validate(_set, path, errorStack, callStack){
		if(_set instanceof Set){
			for(let item of _set.values()){
				checkDefinition(item, this.definition, (path || "Set"), errorStack, callStack);
			}
		} else {
			errorStack.push({
				expected: this,
				received: _set,
				path
			});
		}
		checkAssertions(_set, this, errorStack);
	}
});

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

function getModel(instance){
	if(instance === undefined || instance === null)
		return null;

	const proto = Object.getPrototypeOf(instance);
	if(!proto || !proto.constructor || !is(Model, proto.constructor))
		return null;

	return proto.constructor
}

function format(x, config){
	if(x === null || x === undefined)
		return ["span", { style: styles.null }, String(x)];

	if(typeof x === "boolean")
		return ["span", { style: styles.boolean }, x];

	if(typeof x === "number")
		return ["span", { style: styles.number }, x];

	if(typeof x === "string")
		return ["span", { style: styles.string }, `"${x}"`];

	if(is(Array, x)){
		let def = [];
		if(x.length === 1) x.push(undefined, null);
		for(let i=0; i < x.length; i++){
			def.push(format(x[i]) );
			if(i < x.length - 1) def.push(' or ');
		}
		return ["span", {}, ...def]
	}

	if(isPlainObject(x))
		return formatObject(x, getModel(x), config)

	if(isFunction(x) && !is(Model, x))
		return ["span", { style: styles.function }, x.name || x.toString()];

	return x ? ['object', { object: x, config }] : null
}

function formatObject(o, model, config){
	return [
		'ol', { style: styles.list },
		'{',
		...Object.keys(o).map(prop => {
			let isPrivate = model && model.conventionForPrivate(prop);
			return ['li', { style: styles.listItem },
				['span', { style: isPrivate ? styles.private : styles.property }, prop], ': ',
				format(o[prop], config)
			]
		}),
		'}'
	];
}

function formatHeader(x, config){
	if(is(Model, x))
		return ["span", { style: styles.model }, x.name];

	if(config.fromModel || isPlainObject(x) || Array.isArray(x))
		return format(x)

	return null;
}

const ModelFormatter = {
	header: function(x, config={}) {
		if (config.fromModel || is(Model, x))
			return formatHeader(x, config);

		return null;
	},
	hasBody: function(x) {
		return is(Model, x)
	},
	body: function(x) {
		return format(x.definition, { fromModel: true })
	}
};

const ModelInstanceFormatter = {
	header: function(x, config={}) {
		if(config.fromInstance && isPlainObject(x)){
			return formatHeader(x, config)
		}

		const model = getModel(x);
		if(is(Model, model)){
			return ["span", { style: styles.model }, x.constructor.name];
		}

		return null;
	},
	hasBody: function(x) {
		return x && is(ObjectModel, getModel(x))
	},
	body: function(x) {
		return formatObject(x, getModel(x), { fromInstance: true })
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

}((this.window = this.window || {})));
