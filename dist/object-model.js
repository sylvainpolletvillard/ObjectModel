// ObjectModel v3.0.0 - http://objectmodel.js.org
;(function(global){
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
ON_FAIL               = "_onFail",
VALIDATE              = "validate",
VALIDATOR             = "_validator",
TEST                  = "test",
EXTEND                = "extend",
EXPECTED              = "expected",
RECEIVED              = "received",
PATH                  = "path",
MESSAGE               = "message",
ERROR_STACK           = "errorStack",
ERROR_COLLECTOR       = "errorCollector",
UNSTACK_ERRORS        = "unstackErrors",
PROTO                 = "prototype",
CONSTRUCTOR           = "constructor",	
DEFAULT               = "default",
DEFAULTS              = "defaults",
RETURN                = "return",
ARGS                  = "arguments",

ARRAY_MUTATOR_METHODS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"],
SET_MUTATOR_METHODS   = ["add", "delete", "clear"],	
MAP_MUTATOR_METHODS   = ["set", "delete", "clear"]
const defineProperty = Object.defineProperty;

function is(Constructor, obj){
	return obj instanceof Constructor;
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

function bettertypeof(obj){
	return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1]
}

function deepAssign(target, src) {
	Object.keys(src || {}).forEach(key => {
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
	Object.setPrototypeOf(model, constructor[PROTO])
	define(model, CONSTRUCTOR, constructor)
}

function setConstructorProto(constructor, proto){
	constructor[PROTO] = Object.create(proto)
	constructor[PROTO][CONSTRUCTOR] = constructor
}

function toString(obj, stack = []){
	if(stack.length > 15 || stack.includes(obj)) return '...'
	if(obj == null) return String(obj)
	if(typeof obj == "string") return `"${obj}"`
	if(is(Model, obj)) return obj.toString(stack)
	stack = [obj].concat(stack)
	if(isFunction(obj)) return obj.name || obj.toString(stack)
	if(is(Array, obj)) return `[${obj.map(item => toString(item, stack)).join(', ')}]`
	if(obj.toString !== Object.prototype.toString) return obj.toString();
	if(obj && isObject(obj)) {
		const props = Object.keys(obj),
			  indent = '\t'.repeat(stack.length)
		return `{${props.map(
			key => `\n${indent+key}: ${toString(obj[key], stack)}`
		).join(',')} ${props.length ? `\n${indent.slice(1)}` : ''}}`
	}
	return String(obj)
}
function Model(def){
	if(!isLeaf(def)) return Model[OBJECT](def)

	const model = function(obj=model[DEFAULT]) {
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
		this[VALIDATOR](obj, null, this[ERROR_STACK], [])
		this[UNSTACK_ERRORS](errorCollector)
	},

	[TEST](obj){
		const errorStack = []
		this[VALIDATOR](obj, null, errorStack, [])
		return !errorStack.length
	},

	[EXTEND](){
		let def, proto, assertions = [...this[ASSERTIONS]]
		const args = [...arguments]

		if(is(Model[OBJECT], this)){
			def = {}
			proto = {}
			Object.assign(def, this[DEFINITION])
			Object.assign(proto, this[PROTO])
			args.forEach(arg => {
				if(is(Model, arg)){
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
			if(is(Model, arg)) assertions = assertions.concat(arg[ASSERTIONS])
		})

		const submodel = new this[CONSTRUCTOR](def)
		setConstructorProto(submodel, this[PROTO])
		Object.assign(submodel[PROTO], proto)
		submodel[ASSERTIONS] = assertions
		submodel[ERROR_COLLECTOR] = this[ERROR_COLLECTOR]
		return submodel
	},

	assert(assertion, description = toString(assertion)){
		const onFail = isFunction(description) ? description : (assertionResult, value) =>
			`assertion "${description}" returned ${toString(assertionResult)} for value ${toString(value)}`
		define(assertion, ON_FAIL, onFail)
		this[ASSERTIONS] = this[ASSERTIONS].concat(assertion)
		return this
	},

	defaultTo(val){
		this[DEFAULT] = val;
		return this;
	},

	[ERROR_COLLECTOR](errors){
		throw new TypeError(errors.map(function(e){ return e[MESSAGE] }).join('\n'))
	},

	[VALIDATOR](obj, path, errorStack, callStack){
		checkDefinition(obj, this[DEFINITION], path, errorStack, callStack)
		checkAssertions(obj, this, errorStack)
	},

	// throw all errors collected
	[UNSTACK_ERRORS](errorCollector){
		if (!this[ERROR_STACK].length) return
		if (!errorCollector) errorCollector = this.errorCollector
		const errors = this[ERROR_STACK].map(err => {
			if (!err[MESSAGE]) {
				const def = is(Array, err[EXPECTED]) ? err[EXPECTED] : [err[EXPECTED]]
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
		if(!is(Array, def)) return [def]
		else if(def.length === 1) return [...def, undefined, null]
	} else {
		for(let key of def) def[key] = parseDefinition(def[key])
	}
	return def
}

function checkDefinition(obj, def, path, errorStack, callStack){
	if(is(Model, def)){
		const indexFound = callStack.indexOf(def)
		//if found twice in call stack, cycle detected, skip validation
		if(indexFound !== -1 && callStack.indexOf(def, indexFound+1) !== -1) return
		return def[VALIDATOR](obj, path, errorStack, callStack.concat(def))
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
		Object.keys(def).forEach(key => {
			const val = obj != null ? obj[key] : undefined
			checkDefinition(val, def[key], path ? path + '.' + key : key, errorStack, callStack)
		})
	}
}

function checkDefinitionPart(obj, def, path, callStack){
	if(obj == null) return obj === def
	if(!isLeaf(def) || is(Model, def)){ // object or model as part of union type
		const errorStack = []
		checkDefinition(obj, def, path, errorStack, callStack)
		return !errorStack.length
	}
	if(is(RegExp, def)) return def[TEST](obj)
	if(def === Number || def === Date) return obj[CONSTRUCTOR] === def && !isNaN(obj)
	return obj === def
		|| (isFunction(def) && is(def, obj))
		|| obj[CONSTRUCTOR] === def
}

function checkAssertions(obj, model, errorStack = model[ERROR_STACK]){
	for(let assertion of model[ASSERTIONS]){
		let assertionResult;
		try {
			assertionResult = assertion.call(model, obj)
		} catch(err){
			assertionResult = err
		}
		if(assertionResult !== true){
			errorStack.push({
				[MESSAGE]: assertion[ON_FAIL].call(model, assertionResult, obj)
			})
		}
	}
}
Model[OBJECT] = function ObjectModel(def){

	const model = function(obj = model[DEFAULT]) {
		if(!is(model, this)) return new model(obj)
		deepAssign(this, obj)
		const proxy = getProxy(model, this, model[DEFINITION])
		model[VALIDATE](proxy)
		return proxy
	}

	setConstructorProto(model, Object[PROTO])
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

	[VALIDATOR](obj, path, errorStack, callStack){
		if(!isObject(obj)){
			errorStack.push({
				[EXPECTED]: this,
				[RECEIVED]: obj,
				[PATH]: path
			})
		} else {
			checkDefinition(obj, this[DEFINITION], path, errorStack, callStack)
		}
		checkAssertions(obj, this)
	}
})

function getProxy(model, obj, defNode, path) {
	if(is(Model, defNode) && obj && !is(defNode, obj))
		return defNode(obj)
	else if(is(Array, defNode)){ // union type
		let suitableModels = []
		for(let part of defNode.filter(part => is(Model, part))){
			if(is(part, obj)) return obj
			if(part.test(obj)) suitableModels.push(part)
		}
		if(suitableModels.length === 1)
			return suitableModels[0](obj); // automatically cast to suitable model when explicit
		else if(suitableModels.length > 1)
			console.warn(`Ambiguous model for value ${toString(obj)},
			 could be ${suitableModels.join(" or ")}`);
		return obj;
	}
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
				checkDefinition(newProxy, defNode[key], newPath, model[ERROR_STACK], [])
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
		},
		getPrototypeOf(){
			return model[PROTO];
		}
	});
}
Model[ARRAY] = function ArrayModel(def){

	const model = function(array = model[DEFAULT]) {
		model[VALIDATE](array)
		return new Proxy(array, {
			get(arr, key) {
				if (key === CONSTRUCTOR)
					return model
				else if (ARRAY_MUTATOR_METHODS.includes(key))
					return proxifyArrayMethod(arr, key, model)
				return arr[key]
			},
			set(arr, key, val) {
				setArrayKey(arr, key, val, model)
			},
			getPrototypeOf(){
				return model[PROTO];
			}
		})
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

	[VALIDATOR](arr, path, errorStack, callStack){
		if(is(Array, arr))
			arr.forEach((item,i) => checkDefinition(item, this[DEFINITION], `${path||ARRAY}[${i}]`, errorStack, callStack))
		else errorStack.push({
			[EXPECTED]: this,
			[RECEIVED]: arr,
			[PATH]: path
		})
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
		checkDefinition(value, model[DEFINITION], ARRAY+'['+key+']', model[ERROR_STACK], [])
	}
	const testArray = array.slice()
	testArray[key] = value
	checkAssertions(testArray, model)
	model[UNSTACK_ERRORS]()
	array[key] = value
}
Model[FUNCTION] = function FunctionModel(){

	const model = function(fn = model[DEFAULT]) {
		const def = model[DEFINITION]
		const proxyFn = function () {
			const args = [];
			Object.assign(args, def[DEFAULTS])
			Object.assign(args, [...arguments])
			if (args.length > def[ARGS].length) {
				model[ERROR_STACK].push({
					[EXPECTED]: toString(fn) + " to be called with " + def[ARGS].length + " "+ARGS,
					[RECEIVED]: args.length
				})
			}
			def[ARGS].forEach((argDef, i) => checkDefinition(args[i], argDef, `${ARGS}[${i}]`, model[ERROR_STACK], []))
			checkAssertions(args, model)

			let returnValue;
			if(!model[ERROR_STACK].length){
				returnValue = fn.apply(this, args)
				if (RETURN in def)
					checkDefinition(returnValue, def[RETURN], RETURN+' value', model[ERROR_STACK], [])
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
	[VALIDATOR](f, path, errorStack){
		if (!isFunction(f)) {
			errorStack.push({
				[EXPECTED]: FUNCTION,
				[RECEIVED]: f,
				[PATH]: path
			})
		}
	}
})

global.Model = Model;
})(this);