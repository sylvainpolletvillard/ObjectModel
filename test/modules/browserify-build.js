(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// ObjectModel v3.0.0 - http://objectmodel.js.org
;(function (globals, factory) {
 if (typeof define === 'function' && define.amd) define(factory); // AMD
 else if (typeof exports === 'object') module.exports = factory(); // Node
 else globals['Model'] = factory(); // globals
}(this, function () {
// string constants
const
OBJECT                = "Object",
ARRAY                 = "Array",
SET                   = "Set",
MAP                   = "Map",	
FUNCTION              = "Function",
CONVENTION_CONSTANT   = "conventionForConstant",
CONVENTION_PRIVATE    = "conventionForPrivate",
DEFINITION            = "definition",
ASSERTIONS            = "assertions",
VALIDATE              = "validate",
VALIDATOR             = "_validator",
TEST                  = "test",
EXTEND                = "extend",	
DESCRIPTION           = "description",
EXPECTED              = "expected",
RECEIVED              = "received",
PATH                  = "path",
MESSAGE               = "message",
ERROR_STACK           = "errorStack",
ERROR_COLLECTOR       = "errorCollector",
UNSTACK_ERRORS        = "unstackErrors",
PROTO                 = "prototype",
CONSTRUCTOR           = "constructor",	
DEFAULTS              = "defaults",
RETURN                = "return",
ARGS                  = "arguments",

ARRAY_MUTATOR_METHODS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"],
SET_MUTATOR_METHODS   = ["add", "delete", "clear"],	
MAP_MUTATOR_METHODS   = ["set", "delete", "clear"]

// references shortcuts
const
O                     = Object,
defineProperty        = O.defineProperty
function isFunction(o){
	return typeof o === "function"
}
function isObject(o){
    return typeof o === "object"
}

function isPlainObject(o){
	return o && isObject(o) && O.getPrototypeOf(o) === O.prototype
}

function bettertypeof(obj){
	return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1]
}

function deepAssign(target, src) {
	O.keys(src || {}).forEach(key => {
		if(isPlainObject(src[key])){
			const o = {}
			deepAssign(o, target[key])
			deepAssign(o, src[key])
			target[key] = o
		} else {
			target[key] = src[key]
		}
	})
}

function define(obj, key, value, enumerable) {
	defineProperty(obj, key, { value, enumerable, writable: true, configurable: true })
}

function setConstructor(model, constructor){
	O.setPrototypeOf(model, constructor[PROTO])
	define(model, CONSTRUCTOR, constructor)
}

function setConstructorProto(constructor, proto){
	constructor[PROTO] = O.create(proto)
	constructor[PROTO][CONSTRUCTOR] = constructor
}

function toString(obj, stack = []){
	if(stack.length > 15 || stack.includes(obj)) return '...'
	if(obj == null) return String(obj)
	if(typeof obj == "string") return `"${obj}"`
	if(obj instanceof Model) return obj.toString(stack);
	stack = [obj].concat(stack)
	if(isFunction(obj)) return obj.name || obj.toString(stack)
	if(Array.isArray(obj)) return `[${obj.map(item => toString(item, stack)).join(', ')}]`
	if(obj && isObject(obj)) {
		const props = O.keys(obj),
			  indent = '\t'.repeat(stack.length)
		return `{${props.map(
			key => `\n${indent+key}: ${toString(obj[key], stack)}`
		).join(',')} ${props.length ? `\n${indent.slice(1)}` : ''}}`
	}
	return String(obj)
}
function Model(def){
	if(!isLeaf(def)) return Model[OBJECT](def)

	const model = function(obj) {
		model[VALIDATE](obj)
		return obj
	}

	initModel(model, def, Model)
	return model
}

setConstructorProto(Model, Function[PROTO])

Object.assign(Model[PROTO], {
	toString(stack){
		return parseDefinition(this[DEFINITION]).map(d => toString(d, stack)).join(" or ")
	},

	[ASSERTIONS]: [],

	[VALIDATE](obj, errorCollector){
		this[VALIDATOR](obj, null, [], this[ERROR_STACK])
		this[UNSTACK_ERRORS](errorCollector)
	},

	[TEST](obj){
		const errorStack = []
		this[VALIDATOR](obj, null, [], errorStack)
		return !errorStack.length
	},

	[EXTEND](){
		let def, proto, assertions = [...this[ASSERTIONS]]
		const args = [...arguments]

		if(this instanceof Model[OBJECT]){
			def = {}
			proto = {}
			Object.assign(def, this[DEFINITION])
			Object.assign(proto, this[PROTO])
			args.forEach(arg => {
				if(arg instanceof Model){
					deepAssign(def, arg[DEFINITION])
					deepAssign(proto, arg[PROTO])
				} else {
					deepAssign(def, arg)
				}
			})
		} else {
			def = args
				.reduce((def, ext) => def.concat(parseDefinition(ext)), parseDefinition(this[DEFINITION]))
				.filter((value, index, self) => self.indexOf(value) === index) // remove duplicates
		}

		args.forEach(arg => {
			if(arg instanceof Model) assertions = assertions.concat(arg[ASSERTIONS])
		})

		var submodel = new this[CONSTRUCTOR](def)
		setConstructorProto(submodel, this[PROTO])
		Object.assign(submodel[PROTO], proto)
		submodel[ASSERTIONS] = assertions
		submodel[ERROR_COLLECTOR] = this[ERROR_COLLECTOR]
		return submodel
	},

	assert(assertion, message){
		define(assertion, DESCRIPTION, message)
		this[ASSERTIONS].push(assertion)
		return this
	},

	[ERROR_COLLECTOR](errors){
		throw new TypeError(errors.map(function(e){ return e[MESSAGE] }).join('\n'))
	},

	[VALIDATOR](obj, path, callStack, errorStack){
		checkDefinition(obj, this[DEFINITION], path, callStack, errorStack)
		checkAssertions(obj, this, errorStack)
	},

	// throw all errors collected
	[UNSTACK_ERRORS](errorCollector){
		if (!this[ERROR_STACK].length) return
		if (!errorCollector) errorCollector = this.errorCollector
		const errors = this[ERROR_STACK].map(err => {
			if (!err[MESSAGE]) {
				const def = Array.isArray(err[EXPECTED]) ? err[EXPECTED] : [err[EXPECTED]]
				err[MESSAGE] = ("expecting " + (err[PATH] ? err[PATH] + " to be " : "") + def.map(d => toString(d)).join(" or ")
				+ ", got " + (err[RECEIVED] != null ? bettertypeof(err[RECEIVED]) + " " : "") + toString(err[RECEIVED]))
			}
			return err
		})
		this[ERROR_STACK] = []
		errorCollector.call(this, errors)
	}

})

Model[CONVENTION_CONSTANT] = key => key.toUpperCase() === key
Model[CONVENTION_PRIVATE] = key => key[0] === "_"

const isLeaf = def => bettertypeof(def) != "Object"

function initModel(model, def, constructor){
	setConstructor(model, constructor)
	model[DEFINITION] = def
	model[ASSERTIONS] = model[ASSERTIONS].slice();
	define(model, ERROR_STACK, [])
}

function parseDefinition(def){
	if(isLeaf(def)){
		if(!Array.isArray(def)) return [def]
		else if(def.length === 1) return [...def, undefined, null]
	} else {
		for(let key of def) def[key] = parseDefinition(def[key])
	}
	return def
}

function checkDefinition(obj, def, path, callStack, errorStack){
	if(def instanceof Model){
		const indexFound = callStack.indexOf(def)
		//if found twice in call stack, cycle detected, skip validation
		if(indexFound !== -1 && callStack.indexOf(def, indexFound+1) !== -1) return
		return def[VALIDATOR](obj, path, callStack.concat(def), errorStack)
	}
	else if(isLeaf(def)){
		const pdef = parseDefinition(def)
		if(pdef.some(part => checkDefinitionPart(obj, part, path, callStack))) return
		errorStack.push({
			[EXPECTED]: def,
			[RECEIVED]: obj,
			[PATH]: path
		})
	} else {
		O.keys(def).forEach(key => {
			const val = obj != null ? obj[key] : undefined
			checkDefinition(val, def[key], path ? path + '.' + key : key, callStack, errorStack)
		})
	}
}

function checkDefinitionPart(obj, def, path, callStack){
	if(obj == null) return obj === def
	if(!isLeaf(def) || def instanceof Model){ // object or model as part of union type
		const errorStack = []
		checkDefinition(obj, def, path, callStack, errorStack)
		return !errorStack.length
	}
	if(def instanceof RegExp) return def[TEST](obj)
	return obj === def
		|| (isFunction(def) && obj instanceof def)
		|| obj[CONSTRUCTOR] === def
}

function checkAssertions(obj, model, errorStack = model[ERROR_STACK]){
	for(let assertion of model[ASSERTIONS]){
		let assertionResult = assertion.call(model, obj);
		if(assertionResult !== true){
			let message = isFunction(assertion[DESCRIPTION]) ? assertion[DESCRIPTION].call(model, assertionResult) : assertion[DESCRIPTION];
			errorStack.push({
				[MESSAGE]: `assertion failed: ${message || toString(assertion) }`
			})
		}
	}
}
Model[OBJECT] = function ObjectModel(def){

	const model = function(obj) {
		if(!(this instanceof model)) return new model(obj)
		deepAssign(this, obj)
		const proxy = getProxy(model, this, model[DEFINITION])
		model[VALIDATE](proxy)
		return proxy
	}

	setConstructorProto(model, O[PROTO])
	initModel(model, def, Model[OBJECT])
	return model
}

setConstructorProto(Model[OBJECT], Model[PROTO])

Object.assign(Model[OBJECT][PROTO], {

	[DEFAULTS](p){
		Object.assign(this[PROTO], p)
		return this
	},

	toString(stack){
		return toString(this[DEFINITION], stack)
	},

	[VALIDATOR](obj, path, callStack, errorStack){
		if(!isObject(obj)){
			errorStack.push({
				[EXPECTED]: this,
				[RECEIVED]: obj,
				[PATH]: path
			})
		} else {
			checkDefinition(obj, this[DEFINITION], path, callStack, errorStack)
		}
		checkAssertions(obj, this)
	}
})

function getProxy(model, obj, defNode, path) {
	if(defNode instanceof Model && obj && !(obj instanceof defNode))
		return defNode(obj)
	else if(isLeaf(defNode))
		return obj

	return new Proxy(obj || {}, {
		get(o, key) {
			const newPath = (path ? path + '.' + key : key);
			return getProxy(model, o[key], defNode[key], newPath);
		},
		set(o, key, val) {
			const newPath = (path ? path + '.' + key : key),
				  isConstant = Model[CONVENTION_CONSTANT](key),
				  initialValue = o[key];
			
			if(isConstant && initialValue !== undefined){
				model[ERROR_STACK].push({
					[MESSAGE]: `cannot redefine constant ${key}`
				})
			}
			if(defNode.hasOwnProperty(key)){
				const newProxy = getProxy(model, val, defNode[key], newPath)
				checkDefinition(newProxy, defNode[key], newPath, [], model[ERROR_STACK])
				o[key] = newProxy
				checkAssertions(obj, model)
			} else {
				model[ERROR_STACK].push({
					[MESSAGE]: `cannot find property ${newPath} in the model definition`
				})
			}
		
			if(model[ERROR_STACK].length){
				o[key] = initialValue
				model[UNSTACK_ERRORS]()
			}
		},
		has(o, key){
			return Reflect.has(o, key) && !Model[CONVENTION_PRIVATE](key)
		},
		ownKeys(o){
			return Reflect.ownKeys(o).filter(key => !Model[CONVENTION_PRIVATE](key))
		}
	});
}
Model[ARRAY] = function ArrayModel(def){

	const model = function(array) {
		model[VALIDATE](array)
		const proxy = new Proxy(array, {
			get: function (arr, key) {
				return ARRAY_MUTATOR_METHODS.includes(key) ? proxifyArrayMethod(arr, key, model) : arr[key]
			},
			set: function (arr, key, val) {
				setArrayKey(arr, key, val, model)
			}
		})
		setConstructor(proxy, model)
		return proxy
	}

	setConstructorProto(model, Array[PROTO])
	initModel(model, def, Model[ARRAY])
	return model
}

setConstructorProto(Model[ARRAY], Model[PROTO])
Object.assign(Model[ARRAY][PROTO], {

	toString(stack){
		return ARRAY + ' of ' + toString(this[DEFINITION], stack)
	},

	[VALIDATOR](arr, path, callStack, errorStack){
		if(Array.isArray(arr)){
			arr.forEach((item,i) => checkDefinition(item, this[DEFINITION], (path||ARRAY)+'['+i+']', callStack, errorStack))
		} else {
			errorStack.push({
				[EXPECTED]: this,
				[RECEIVED]: arr,
				[PATH]: path
			})
		}
		checkAssertions(arr, this)
	}
})

function proxifyArrayMethod(array, method, model){
	return function() {
		const testArray = array.slice()
		Array[PROTO][method].apply(testArray, arguments)
		model[VALIDATE](testArray)
		return Array[PROTO][method].apply(array, arguments)
	}
}

function setArrayKey(array, key, value, model){
	if(parseInt(key) === +key && key >= 0){
		checkDefinition(value, model[DEFINITION], ARRAY+'['+key+']', [], model[ERROR_STACK])
	}
	const testArray = array.slice()
	testArray[key] = value
	checkAssertions(testArray, model)
	model[UNSTACK_ERRORS]()
	array[key] = value
}
Model[FUNCTION] = function FunctionModel(){

	const model = function(fn) {

		const def = model[DEFINITION]
		const proxyFn = function () {
			const args = []
			Object.assign(args, def[DEFAULTS])
			Object.assign(args, [...arguments])
			if (args.length > def[ARGS].length) {
				model[ERROR_STACK].push({
					[EXPECTED]: toString(fn) + " to be called with " + def[ARGS].length + " "+ARGS,
					[RECEIVED]: args.length
				})
			}
			def[ARGS].forEach((argDef, i) => checkDefinition(args[i], argDef, ARGS + '[' + i + ']', [], model[ERROR_STACK]))
			checkAssertions(args, model)
			const returnValue = fn.apply(this, args)
			if (RETURN in def) {
				checkDefinition(returnValue, def[RETURN], RETURN+' value', [], model[ERROR_STACK])
			}
			model[UNSTACK_ERRORS]()
			return returnValue
		}
		setConstructor(proxyFn, model)
		return proxyFn
	}

	setConstructorProto(model, Function[PROTO])

	const def = { [ARGS]: [...arguments] }
	initModel(model, def, Model[FUNCTION])
	return model
}

setConstructorProto(Model[FUNCTION], Model[PROTO])

Object.assign(Model[FUNCTION][PROTO], {

	toString(stack){
		let out = FUNCTION + '(' + this[DEFINITION][ARGS].map(argDef => toString(argDef, stack)).join(",") +')'
		if(RETURN in this[DEFINITION]) {
			out += " => " + toString(this[DEFINITION][RETURN])
		}
		return out
	},

	[RETURN](def){
		this[DEFINITION][RETURN] = def
		return this
	},

	[DEFAULTS](){
		this[DEFINITION][DEFAULTS] = [...arguments]
		return this
	},
	[VALIDATOR](f, path, callStack, errorStack){
		if (!isFunction(f)) {
			errorStack.push({
				[EXPECTED]: FUNCTION,
				[RECEIVED]: f,
				[PATH]: path
			})
		}
	}
})
return Model;
}));
},{}],2:[function(require,module,exports){
var Model = require('../../dist/object-model.umd');
testSuite(Model);
},{"../../dist/object-model.umd":1}]},{},[2]);
