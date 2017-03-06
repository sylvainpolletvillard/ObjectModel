/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.l = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };

/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};

/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};

/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 13);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__helpers__ = __webpack_require__(1);
/* harmony export (immutable) */ __webpack_exports__["c"] = BasicModel;
/* harmony export (immutable) */ __webpack_exports__["b"] = initModel;
/* unused harmony export parseDefinition */
/* harmony export (immutable) */ __webpack_exports__["d"] = checkDefinition;
/* unused harmony export checkDefinitionPart */
/* harmony export (immutable) */ __webpack_exports__["e"] = checkAssertions;
/* harmony export (immutable) */ __webpack_exports__["f"] = cast;


function BasicModel(def){
	const model = function(obj = model.default) {
		model.validate(obj)
		return obj
	}

	initModel(model, arguments, BasicModel)
	return model
}

__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["a" /* setConstructorProto */])(BasicModel, Function.prototype)

Object.assign(BasicModel.prototype, {
	toString(stack){
		return parseDefinition(this.definition).map(d => __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["b" /* toString */])(d, stack)).join(" or ")
	},

	assertions: [],

	validate(obj, errorCollector){
		this._validate(obj, null, this.errorStack, [])
		this.unstackErrors(errorCollector)
	},

	test(obj){
		let failed,
		    initialErrorCollector = this.errorCollector
		this.errorCollector = () => { failed = true }
		this(obj)
		this.errorCollector = initialErrorCollector
		return !failed
	},

	extend(){
		const args = [...arguments]
		const def = args
			.reduce((def, ext) => def.concat(parseDefinition(ext)), parseDefinition(this.definition))
			.filter((value, index, self) => self.indexOf(value) === index) // remove duplicates

		let assertions = [...this.assertions]
		args.forEach(arg => {
			if(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["c" /* is */])(BasicModel, arg)) assertions = assertions.concat(arg.assertions)
		})

		const submodel = new this.constructor(def)
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["a" /* setConstructorProto */])(submodel, this.prototype)
		submodel.assertions = assertions
		submodel.errorCollector = this.errorCollector
		return submodel
	},

	assert(assertion, description = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["b" /* toString */])(assertion)){
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["d" /* define */])(assertion, "description", description);
		this.assertions = this.assertions.concat(assertion)
		return this
	},

	defaultTo(val){
		this.default = val
		return this
	},

	errorCollector(errors){
		let e = new TypeError(errors.map(e => e.message).join('\n'))
		e.stack = e.stack.replace(/\n.*object-model(.|\n)*object-model.*/, "") // blackbox objectmodel in stacktrace
		throw e
	},

	_validate(obj, path, errorStack, callStack){
		checkDefinition(obj, this.definition, path, errorStack, callStack)
		checkAssertions(obj, this, path, errorStack)
	},

	// throw all errors collected
	unstackErrors(errorCollector){
		if (!this.errorStack.length) return
		if (!errorCollector) errorCollector = this.errorCollector
		const errors = this.errorStack.map(err => {
			if (!err.message) {
				const def = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["c" /* is */])(Array, err.expected) ? err.expected : [err.expected]
				err.message = ("expecting " + (err.path ? err.path + " to be " : "") + def.map(d => __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["b" /* toString */])(d)).join(" or ")
				+ ", got " + (err.received != null ? __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["e" /* bettertypeof */])(err.received) + " " : "") + __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["b" /* toString */])(err.received))
			}
			return err
		})
		this.errorStack = []
		errorCollector.call(this, errors)
	}

})

BasicModel.prototype.conventionForConstant = key => key.toUpperCase() === key
BasicModel.prototype.conventionForPrivate = key => key[0] === "_"

function initModel(model, args, constructor){
	if(args.length === 0) throw new Error("Model definition is required");
	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["f" /* setConstructor */])(model, constructor)
	model.definition = args[0]
	model.assertions = model.assertions.slice()
	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["d" /* define */])(model, "errorStack", [])
}

function parseDefinition(def){
	if(!__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["g" /* isPlainObject */])(def)){
		if(!__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["c" /* is */])(Array, def)) return [def]
		if(def.length === 1) return [...def, undefined, null]
	} else {
		for(let key of Object.keys(def))
			def[key] = parseDefinition(def[key])
	}
	return def
}

function checkDefinition(obj, def, path, errorStack, callStack, shouldCast=false){
	const indexFound = callStack.indexOf(def)
	if(indexFound !== -1 && callStack.indexOf(def, indexFound+1) !== -1)
		return obj //if found twice in call stack, cycle detected, skip validation

	if(shouldCast)
		obj = cast(obj, def)


	if(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["c" /* is */])(BasicModel, def)){
		def._validate(obj, path, errorStack, callStack.concat(def))
	}
	else if(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["g" /* isPlainObject */])(def)){
		Object.keys(def).forEach(key => {
			const val = obj != null ? obj[key] : undefined
			checkDefinition(val, def[key], path ? path + '.' + key : key, errorStack, callStack)
		})
	}
	else {
		const pdef = parseDefinition(def)
		if(pdef.some(part => checkDefinitionPart(obj, part, path, callStack)))
			return obj

		errorStack.push({
			expected: def,
			received: obj,
			path
		})
	}

	return obj
}

function checkDefinitionPart(obj, def, path, callStack){
	if(obj == null) return obj === def
	if(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["g" /* isPlainObject */])(def) || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["c" /* is */])(BasicModel, def)){ // object or model as part of union type
		const errorStack = []
		checkDefinition(obj, def, path, errorStack, callStack)
		return !errorStack.length
	}
	if(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["c" /* is */])(RegExp, def)) return def.test(obj)
	if(def === Number || def === Date) return obj.constructor === def && !isNaN(obj)
	return obj === def
		|| (__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["h" /* isFunction */])(def) && __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["c" /* is */])(def, obj))
		|| obj.constructor === def
}

function checkAssertions(obj, model, path, errorStack = model.errorStack){
	for(let assertion of model.assertions){
		let result
		try {
			result = assertion.call(model, obj)
		} catch(err){
			result = err
		}
		if(result !== true){
			const onFail = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["h" /* isFunction */])(assertion.description) ? assertion.description : (assertionResult, value) =>
				`assertion "${assertion.description}" returned ${__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["b" /* toString */])(assertionResult)} for value ${__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["b" /* toString */])(value)}`
			errorStack.push({
				message: onFail.call(model, result, obj),
				expected: assertion,
				received: obj,
				path
			})
		}
	}
}

function cast(obj, defNode=[]) {
	if(!obj || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["g" /* isPlainObject */])(defNode) || __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["c" /* is */])(BasicModel, obj.constructor))
		return obj // no value or not leaf or already a model instance

	const def = parseDefinition(defNode),
	      suitableModels = []

	for (let part of def) {
		if(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["c" /* is */])(BasicModel, part) && part.test(obj))
			suitableModels.push(part)
	}

	if (suitableModels.length === 1)
		return suitableModels[0](obj) // automatically cast to suitable model when explicit

	if (suitableModels.length > 1)
		console.warn(`Ambiguous model for value ${__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__helpers__["b" /* toString */])(obj)}, could be ${suitableModels.join(" or ")}`)

	return obj
}

/* harmony default export */ __webpack_exports__["a"] = BasicModel;

/***/ }),
/* 1 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__basic_model__ = __webpack_require__(0);
/* harmony export (immutable) */ __webpack_exports__["c"] = is;
/* harmony export (immutable) */ __webpack_exports__["h"] = isFunction;
/* harmony export (immutable) */ __webpack_exports__["j"] = isObject;
/* harmony export (immutable) */ __webpack_exports__["g"] = isPlainObject;
/* harmony export (immutable) */ __webpack_exports__["e"] = bettertypeof;
/* harmony export (immutable) */ __webpack_exports__["i"] = merge;
/* harmony export (immutable) */ __webpack_exports__["d"] = define;
/* harmony export (immutable) */ __webpack_exports__["f"] = setConstructor;
/* harmony export (immutable) */ __webpack_exports__["a"] = setConstructorProto;
/* harmony export (immutable) */ __webpack_exports__["b"] = toString;


const defineProperty = Object.defineProperty

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

function bettertypeof(obj){
	return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1]
}

function merge(target, src={}, deep, includingProto) {
	for(let key in src){
		if(includingProto || src.hasOwnProperty(key)){
			if(deep && isPlainObject(src[key])){
				const o = {}
				merge(o, target[key], deep)
				merge(o, src[key], deep)
				target[key] = o
			} else {
				target[key] = src[key]
			}
		}
	}
}

function define(obj, key, value, enumerable=false) {
	defineProperty(obj, key, { value, enumerable, writable: true, configurable: true })
}

function setConstructor(model, constructor){
	Object.setPrototypeOf(model, constructor.prototype)
	define(model, "constructor", constructor)
}

function setConstructorProto(constructor, proto){
	constructor.prototype = Object.create(proto)
	constructor.prototype.constructor = constructor
}

function toString(obj, stack = []){
	if(stack.length > 15 || stack.includes(obj)) return '...'
	if(obj == null) return String(obj)
	if(typeof obj == "string") return `"${obj}"`
	if(is(__WEBPACK_IMPORTED_MODULE_0__basic_model__["c" /* BasicModel */], obj)) return obj.toString(stack)
	stack = [obj].concat(stack)
	if(isFunction(obj)) return obj.name || obj.toString(stack)
	if(is(Array, obj)) return `[${obj.map(item => toString(item, stack)).join(', ')}]`
	if(obj.toString !== Object.prototype.toString) return obj.toString()
	if(obj && isObject(obj)) {
		const props = Object.keys(obj),
			  indent = '\t'.repeat(stack.length)
		return `{${props.map(
			key => `\n${indent+key}: ${toString(obj[key], stack)}`
		).join(',')} ${props.length ? `\n${indent.slice(1)}` : ''}}`
	}
	return String(obj)
}

/***/ }),
/* 2 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__basic_model__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__object_model__ = __webpack_require__(10);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_2__array_model__ = __webpack_require__(7);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_3__function_model__ = __webpack_require__(8);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_4__map_model__ = __webpack_require__(9);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_5__set_model__ = __webpack_require__(11);
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return __WEBPACK_IMPORTED_MODULE_0__basic_model__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return __WEBPACK_IMPORTED_MODULE_1__object_model__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return __WEBPACK_IMPORTED_MODULE_2__array_model__["a"]; });
/* harmony reexport (binding) */ __webpack_require__.d(__webpack_exports__, "d", function() { return __WEBPACK_IMPORTED_MODULE_3__function_model__["a"]; });
/* unused harmony reexport MapModel */
/* unused harmony reexport SetModel */









/***/ }),
/* 3 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__src_index__ = __webpack_require__(2);


QUnit.module("Array models");

QUnit.test("Array model constructor && proto", function (assert) {

	assert.ok(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */] instanceof Function, "ArrayModel instanceof Function");

	const Arr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])(Number);

	assert.ok(Arr instanceof __WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */] && Arr instanceof Function, "Array models can be declared");

	assert.ok(typeof Arr.extend === "function", "test Array model method extend");
	assert.ok(typeof Arr.assert === "function", "test Array model method assert");
	assert.ok(typeof Arr.test === "function", "test Array model method test");
	assert.ok(typeof Arr.validate === "function", "test Array model method validate");
	assert.ok(Arr.definition === Number, "test Array model prop definition");
	assert.ok(typeof Arr.assertions === "object", "test Array model prop assertions");

});

QUnit.test("Array model instanciation && mutation methods watchers", function (assert) {

	const Arr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])(Number);
	const a   = Arr([]);

	assert.ok(a instanceof Arr && a instanceof Array, "Array models can be instanciated");

	a.push(1);
	a[0] = 42;
	a.splice(1, 0, 5, 6, Infinity);
	assert.throws(function () {
		a.push("toto");
	}, /TypeError/, "push calls are catched");
	assert.throws(function () {
		a[0] = {};
	}, /TypeError/, "array keys set are catched");
	assert.throws(function () {
		a.splice(1, 0, 7, 'oups', 9);
	}, /TypeError/, "splice calls are catched");
	assert.equal(a.length, 4, "array length change is ok");

});

QUnit.test("Array model validation in constructor", function (assert) {

	const Arr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])(Number);
	const b   = Arr([1, 2, 3]);
	assert.equal(b.length, 3, "array.length is ok");

	assert.throws(function () {
		Arr([1, false, 3]);
	}, /TypeError/, "validation in array model constructor 1/2");

	assert.throws(function () {
		Arr([1, 2, 3, function () {
		}]);
	}, /TypeError/, "validation in array model constructor 2/2");

});

QUnit.test("Array model with union types & submodels", function (assert) {

	const Question = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		answer: Number
	});

	const Arr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])([Question, String, Boolean]);
	const a   = Arr(["test"]);
	a.unshift(true);
	a.push(Question({answer: 42}));
	a.push({answer: 43});
	assert.throws(function () {
		a.unshift(42);
	}, /TypeError/, "unshift multiple types");
	assert.throws(function () {
		a[0] = null;
	}, /TypeError/, "set index multiple types");

})

QUnit.test("Array model with union types & fixed values", function (assert) {

	const Arr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])([true, 2, "3"]);
	assert.throws(function () {
		Arr(["3", 2, true, 1]);
	}, /TypeError[\s\S]*Array\[3]/, "ArrayModel fixed values");

	const Cards     = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])([Number, "J", "Q", "K"]); // array of Numbers, J, Q or K
	const Hand      = Cards.extend().assert(cards => cards.length === 2);
	const pokerHand = new Hand(["K", 10]);

	assert.ok(Object.getPrototypeOf(Hand.prototype) === Cards.prototype, "extension respect prototypal chain");
	assert.ok(pokerHand instanceof Hand && pokerHand instanceof Cards, "array model inheritance");
	Cards(["K", 10]).push(7);
	assert.throws(function () {
		Hand(["K", 10]).push(7);
	}, /TypeError/, "min/max of inherit array model");

	const CheaterHand = Cards.extend("joker");
	CheaterHand(["K", 10, "joker"]);
	assert.throws(function () {
		Hand("K", 10, "joker");
	}, /TypeError/, "array model type extension");

})

QUnit.test("Child array models in object models", function (assert) {

	const Child  = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({arr: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])(String)});
	const Parent = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({child: Child});

	const childO = Child({arr: ["a", "b", "c"]});
	assert.ok(childO.arr instanceof Array, "child array model is array");
	const parentO = Parent({child: childO});
	assert.ok(parentO.child.arr instanceof Array, "child array model from parent is array");

	childO.arr.push("a");
	assert.throws(function () {
		childO.arr.push(false);
	}, /TypeError/, "child array model catches push calls");
	assert.throws(function () {
		childO.arr[0] = 1;
	}, /TypeError/, "child array model catches set index");

	assert.ok(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])(undefined) instanceof __WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */], "ArrayModel can receive undefined as argument");
	assert.throws(function () {
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])()
	}, /Error.*Model definition is required/, "ArrayModel without definition throws")

});

QUnit.test("Array model defaults values", function (assert) {

	const ArrModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])([Number, String]).defaultTo([]);
	const a        = ArrModel();

	assert.ok(a instanceof Array && a.length === 0, "Array model default value");

	ArrModel.default.push(1, 2, 3);

	const b = ArrModel();

	assert.ok(b.length === 3 && b.join(";") == "1;2;3", "array model default value is mutable array");

	ArrModel.default = "nope";

	assert.throws(function () {
		ArrModel()
	}, /TypeError.*got String "nope"/, "invalid default property still throws TypeError for array models");

})

QUnit.test("Array model assertions", function (assert) {

	const ArrayMax3 = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])(Number).assert(function maxRange(arr){ return arr.length <= 3; });
	let arr = ArrayMax3([1,2]);

	arr.push(3);
	assert.throws(function(){ arr.push(4); }, /TypeError[\s\S]*maxRange/, "test assertion after array method");

	const ArraySumMax10 = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])(Number).assert(function(arr){
		return arr.reduce(function(a,b){ return a+b; },0) <= 10;
	});

	arr = ArraySumMax10([2,3,4]);
	assert.throws(function(){ arr[1] = 7; }, /TypeError/, "test assertion after array key assignment");

	const AssertArray = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])(Number).assert(v => v.length >= 0, "may throw exception");

	new AssertArray([]);

	assert.throws(function(){ new AssertArray(); },
		/assertion \"may throw exception\" returned TypeError.*for value undefined/,
		"assertions catch exceptions on Array models");

})

QUnit.test("Automatic model casting in array models", function (assert) {

	const N = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({ x: Number, y: [Number] }).defaults({ x: 5, y: 7 });
	const Arr = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])(N);
	const a = Arr([ { x:9 } ]);

	assert.ok(a[0] instanceof N, "test automatic model casting with array init 1/2")
	assert.equal(a[0].x * a[0].y, 63, "test automatic model casting with array init 2/2")

	a.push({ x: 3 });

	assert.ok(a[1] instanceof N, "test automatic model casting with array mutator method 1/2")
	assert.equal(a[1].x * a[1].y, 21, "test automatic model casting with array mutator method 2/2")

	a[0] = { x: 10 };

	assert.ok(a[0] instanceof N, "test automatic model casting with array set index 1/2")
	assert.equal(a[0].x * a[0].y, 70, "test automatic model casting with array set index 2/2");

});

/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__src_index__ = __webpack_require__(2);


QUnit.module("Basic Models");

QUnit.test("Basic models constructor && proto are correctly defined", function (assert) {
	assert.ok(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */] instanceof Function, "BasicModel is defined");

	const NumberModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])(Number);

	assert.ok(typeof NumberModel.extend === "function", "test model method extend");
	assert.ok(typeof NumberModel.assert === "function", "test model method assert");
	assert.ok(typeof NumberModel.test === "function", "test model method test");
	assert.ok(typeof NumberModel.validate === "function", "test model method validate");
	assert.ok(NumberModel.definition === Number, "test model prop definition");
	assert.ok(typeof NumberModel.assertions === "object", "test model prop assertions");

	const NumberModelThroughConstructor = new __WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */](Number);

	assert.ok(typeof NumberModelThroughConstructor.extend === "function", "test new model method extend");
	assert.ok(typeof NumberModelThroughConstructor.assert === "function", "test new model method assert");
	assert.ok(typeof NumberModelThroughConstructor.test === "function", "test new model method test");
	assert.ok(typeof NumberModelThroughConstructor.validate === "function", "test new model method validate");
	assert.ok(NumberModelThroughConstructor.definition === Number, "test new model prop definition");
	assert.ok(typeof NumberModelThroughConstructor.assertions === "object", "test new model prop assertions");
});

QUnit.test("Basic Model with undefined or no definition", function (assert) {

	const UndefinedModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])(undefined);
	assert.ok(UndefinedModel instanceof __WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */], "Model can receive undefined as argument");
	assert.throws(function () {
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])()
	}, /Error.*Model definition is required/, "Model without definition throws")

});

QUnit.test("Basic model behaviour", function (assert) {

	const NumberModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])(Number);
	NumberModel(0); // should not throw
	assert.ok(typeof NumberModel(42) === "number", "should return the original type");
	assert.ok(NumberModel(17) === 17, "should return the original value");
	assert.throws(function () {
		NumberModel("12")
	}, /TypeError/, "test invalid type");
	assert.throws(function () {
		NumberModel(NaN)
	}, /TypeError/, "test NaN is invalid");

})

QUnit.test("Optional basic model behaviour", function (assert) {

	const NumberModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])(Number);
	const OptionalNumberModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])([Number]);

	assert.throws(function () {
		NumberModel()
	}, /TypeError/, "test undefined value for optional model");

	OptionalNumberModel(); // should not throw

	const OptionalExtendedNumberModel = NumberModel.extend(undefined);

	OptionalExtendedNumberModel(); // should not throw

	assert.throws(function () {
		NumberModel()
	}, /TypeError/, "test undefined value on mandatory prop");

});

QUnit.test("Union basic model", function (assert) {

	const myModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])([String, Boolean, Date]);
	myModel("test"); // should not throw
	myModel(true); // should not throw
	myModel(new Date()); // should not throw
	assert.throws(function () {
		myModel()
	}, /TypeError/, "test undefined value");
	assert.throws(function () {
		myModel(0)
	}, /TypeError/, "test invalid type");
	assert.throws(function () {
		myModel(new Date("x"))
	}, /TypeError/, "test invalid date");

	assert.ok(myModel.test("666") === true, "model.test 1/2");
	assert.ok(myModel.test(666) === false, "model.test 2/2");

	myModel.validate("666"); // should not throw
	assert.throws(function () {
		myModel.validate(666)
	}, /TypeError/, "test undefined value");

});

QUnit.test("Basic model default values", function (assert) {

	const myModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])([String, Boolean, Date]);
	myModel.defaultTo("blob");
	assert.strictEqual(myModel.default, "blob", "basic model defaultTo store the value as default property")
	assert.strictEqual(myModel(), "blob", "basic model default property is applied when undefined is passed");
	myModel.default = 42;
	assert.throws(function () {
		myModel()
	}, /TypeError.*got Number 42/, "basic model invalid default property still throws TypeError");

});

QUnit.test("Basic model Assertions", function (assert) {

	function isOdd(n) {
		return n % 2 === 1;
	}

	const OddNumber = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])(Number).assert(isOdd);
	assert.strictEqual(OddNumber(17), 17, "passing assertion on basic model 1/2");
	assert.throws(function () {
		OddNumber(18)
	}, /TypeError[\s\S]*isOdd/, "failing assertion on basic model 1/2");

	const RealNumber = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])(Number).assert(isFinite);

	assert.equal(RealNumber(Math.sqrt(1)), 1, "passing assertion on basic model 2/2");
	assert.throws(function () {
		RealNumber(Math.sqrt(-1))
	}, /TypeError[\s\S]*isFinite/, "failing assertion on basic model 2/2");

	function isPrime(n) {
		for (var i = 2, m = Math.sqrt(n); i <= m; i++) {
			if (n % i === 0) return false;
		}
		return true;
	}

	const PrimeNumber = RealNumber
		.extend() // to not add next assertions to RealNumber model
		.assert(Number.isInteger)
		.assert(isPrime);

	PrimeNumber(83);
	assert.throws(function () {
		PrimeNumber(87);
	}, /TypeError[\s\S]*isPrime/, "test multiple assertions 1");
	assert.throws(function () {
		PrimeNumber(7.77);
	}, /TypeError[\s\S]*isInteger/, "test multiple assertions 2");

	const AssertBasic = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])(Number).assert(function (v) {
		return +v.toString() == v
	}, "may throw exception")

	new AssertBasic(0);

	assert.throws(function () {
			new AssertBasic();
		},
		/assertion \"may throw exception\" returned TypeError.*for value undefined/,
		"assertions catch exceptions on Basic models");

});

QUnit.test("Custom error collectors for basic models", function(assert) {

	assert.expect(13);

	const defaultErrorCollector = __WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */].prototype.errorCollector;
	assert.equal(typeof defaultErrorCollector, "function", "BasicModel has default errorCollector");

	__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */].prototype.errorCollector = function (errors) {
		assert.ok(errors.length === 1, "check errors.length global collector");
		const err = errors[0];
		assert.equal(err.expected, Number, "check error.expected global collector");
		assert.equal(err.received, "nope", "check error.received global collector");
		assert.equal(err.message, 'expecting Number, got String "nope"', "check error.message global collector");
	}

	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])(Number)("nope");

	__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */].prototype.errorCollector = function (errors) {
		assert.ok(errors.length === 1, 'global custom collector assertion error catch 1/2');
		assert.equal(errors[0].message,
			'assertion \"shouldnt be nope\" returned false for value \"nope\"',
			'global custom collector assertion error catch 2/2');
	}

	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])(String).assert(function (s) {
		return s !== "nope"
	}, "shouldnt be nope")("nope");

	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])(Number).validate("nope", function(errors){
		assert.ok(errors.length === 1, "check errors.length custom collector");
		var err = errors[0];
		assert.equal(err.expected, Number, "check error.expected custom collector");
		assert.equal(err.received, "nope", "check error.received custom collector");
		assert.equal(err.message, 'expecting Number, got String "nope"', "check error.message custom collector");
	});

	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])(String).assert(function(s){ return s !== "nope" }, "shouldnt be nope")
		.validate("nope", function(errors){
			assert.ok(errors.length === 1, 'local custom collector assertion error catch 1/2');
			assert.equal(errors[0].message,
				'assertion \"shouldnt be nope\" returned false for value \"nope\"',
				'local custom collector assertion error catch 2/2');
		});

	__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */].prototype.errorCollector = defaultErrorCollector;

});

/***/ }),
/* 5 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__src_index__ = __webpack_require__(2);


QUnit.module("Function models");

QUnit.test("Function models constructor && proto", function (assert) {

	assert.equal(typeof __WEBPACK_IMPORTED_MODULE_0__src_index__["d" /* FunctionModel */], "function", "FunctionModel is defined");

	const Operation = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["d" /* FunctionModel */])(Number, Number).return(Number);

	assert.ok(Operation instanceof __WEBPACK_IMPORTED_MODULE_0__src_index__["d" /* FunctionModel */], "model instance of FunctionModel");
	assert.ok(Operation instanceof Function, "model instanceof Function");

	assert.ok(typeof Operation.extend === "function", "test Function model method extend");
	assert.ok(typeof Operation.assert === "function", "test Function model method assert");
	assert.ok(typeof Operation.test === "function", "test Function model method test");
	assert.ok(typeof Operation.validate === "function", "test Function model method validate");
	assert.ok(typeof Operation.defaults === "function", "test Function model method defaults");
	assert.ok(typeof Operation.return === "function", "test Function model method return");
	assert.equal(Operation.definition.arguments.map(a => a.name).join(','),
		'Number,Number', "test Function model prop definition");
	assert.ok(Operation.definition.return === Number, "test Function model prop return");
	assert.ok(typeof Operation.assertions === "object", "test Function model prop assertions");

});

QUnit.test("Function models instanciation and controls", function (assert) {

	const op = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["d" /* FunctionModel */])(Number, Number).return(Number);

	const add    = op(function (a, b) {
		return a + b;
	});
	const add3   = op(function (a, b, c) {
		return a + b + c;
	});
	const noop   = op(function () {
		return undefined;
	});
	const addStr = op(function (a, b) {
		return String(a) + String(b);
	});

	assert.ok(add instanceof Function && add instanceof op, "fn instanceof functionModel and Function");

	assert.equal(add(15, 25), 40, "valid function model call");
	assert.throws(function () {
		add(15)
	}, /TypeError/, "too few arguments");
	assert.throws(function () {
		add3(15, 25, 42)
	}, /TypeError/, "too much arguments");
	assert.throws(function () {
		noop(15, 25)
	}, /TypeError/, "no return");
	assert.throws(function () {
		addStr(15, 25)
	}, /TypeError/, "incorrect return type");

});

QUnit.test("Function models as object models methods", function (assert) {

	const Person = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		name: String,
		age: Number,
		// function without arguments returning a String
		sayMyName: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["d" /* FunctionModel */])().return(String)
	}).defaults({
		sayMyName: function () {
			return "my name is " + this.name;
		}
	});

	const greetFnModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["d" /* FunctionModel */])(Person).return(String);

	Person.prototype.greet = greetFnModel(function (otherguy) {
		return "Hello " + otherguy.name + ", " + this.sayMyName();
	});

	const joe = new Person({name: "Joe", age: 28});
	const ann = new Person({name: "Ann", age: 23});

	assert.equal(joe.sayMyName(), "my name is Joe", "valid function model method call 1/2");
	assert.equal(joe.greet(ann), "Hello Ann, my name is Joe", "valid function model method call 2/2");

	assert.throws(function () {
		joe.greet("dog");
	}, /TypeError/, "invalid argument type");

});

QUnit.test("Function model defaults arguments & arguments control", function (assert) {

	const Calculator = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["d" /* FunctionModel */])(Number, ["+", "-", "*", "/"], Number)
		.defaults(0, "+", 1)
		.return(Number);

	const calc = new Calculator(function (a, operator, b) {
		return eval(a + operator + b);
	});

	assert.equal(calc(3, "+"), 4, "default argument value");
	assert.equal(calc(41), 42, "defaults arguments values");
	assert.throws(function () {
		calc(6, "*", null);
	}, /TypeError/, "invalid argument type");

});

QUnit.test("Function model with other models & objects as arguments", function (assert) {

	const api = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["d" /* FunctionModel */])({
		list: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])(Number),
		op: ["sum", "product"]
	})(function (options) {
		return options.list.reduce(function (a, b) {
			switch (options.op) {
				case "sum":
					return a + b;
					break;
				case "product":
					return a * b;
					break;
			}
		}, options.op === "product" ? 1 : 0);
	});

	assert.equal(api({list: [1, 2, 3, 4], op: "sum"}), 10, "FunctionModel object argument 1/5");
	assert.equal(api({list: [1, 2, 3, 4], op: "product"}), 24, "FunctionModel object argument 2/5");
	assert.throws(function () {
		api({list: [1, 2, "3", 4], op: "product"});
	}, /TypeError/, "FunctionModel object argument 3/5");
	assert.throws(function () {
		api({list: [1, 2, 3, 4], op: "divide"});
	}, /TypeError/, "FunctionModel object argument 4/5");
	assert.throws(function () {
		api({list: [1, 2, 3, 4]});
	}, /TypeError/, "FunctionModel object argument 5/5");

	assert.ok(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["d" /* FunctionModel */])() instanceof __WEBPACK_IMPORTED_MODULE_0__src_index__["d" /* FunctionModel */], "FunctionModel does not throw when receiving no arguments");

});

QUnit.test("Function model defaults", function (assert) {

	const op  = new __WEBPACK_IMPORTED_MODULE_0__src_index__["d" /* FunctionModel */](Number, Number).return(Number).defaults(11, 31);
	const add = op((a, b) => a + b);
	assert.equal(add(), 42, "defaults arguments for function models correctly applied");

});

QUnit.test("Function model defaultTo", function (assert) {

	const yell = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["d" /* FunctionModel */])(String).return(String).defaultTo(s => s.toUpperCase());

	assert.strictEqual(yell()("yo!"), "YO!", "Function model default value");
	assert.throws(function () {
		yell()(42)
	}, /TypeError.*got Number 42/, "invalid arguments still throws TypeError for defaulted function models");

	yell.default = function (s) {
		return s.length
	};

	assert.throws(function () {
		yell()("yo!")
	}, /TypeError.*got Number 3/, "invalid default property still throws TypeError for function models");

});

QUnit.test("Automatic model casting with Function models", function (assert) {

	const N = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({ x: Number, y: [Number] }).defaults({ x: 5, y: 7 });
	const F = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["d" /* FunctionModel */])(N, N).return(N);
	const f = F(function(a,b){ return { x: a.x+b.x, y: a.y+b.y } });
	const returnValue = f({ x: 1 }, { x: 2 });

	assert.ok(returnValue instanceof N, "test automatic model casting with return value");
	assert.equal(returnValue.x, 3, "test automatic casting with function args 1/2");
	assert.equal(returnValue.y, 14, "test automatic casting with function args 2/2");

})

/***/ }),
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__src_index__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__mocks_console__ = __webpack_require__(12);



QUnit.module("Object Models");

QUnit.test("Object model constructor && proto", function (assert) {

	assert.ok(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */] instanceof Function, "ObjectModel instanceof Function");

	const EmptyObjectModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({});

	assert.ok(typeof EmptyObjectModel.extend === "function", "test object model method extend");
	assert.ok(typeof EmptyObjectModel.assert === "function", "test object model method assert");
	assert.ok(typeof EmptyObjectModel.test === "function", "test object model method test");
	assert.ok(typeof EmptyObjectModel.validate === "function", "test object model method validate");
	assert.ok(typeof EmptyObjectModel.definition === "object", "test object model prop definition");
	assert.ok(typeof EmptyObjectModel.assertions === "object", "test object model prop assertions");

	const EmptyObjectModelThroughConstructor = new __WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */]({});

	assert.ok(typeof EmptyObjectModelThroughConstructor.extend === "function", "test new model method extend");
	assert.ok(typeof EmptyObjectModelThroughConstructor.assert === "function", "test new model method assert");
	assert.ok(typeof EmptyObjectModelThroughConstructor.test === "function", "test new model method test");
	assert.ok(typeof EmptyObjectModelThroughConstructor.validate === "function", "test new model method validate");
	assert.ok(typeof EmptyObjectModelThroughConstructor.definition === "object", "test new model prop definition");
	assert.ok(typeof EmptyObjectModelThroughConstructor.assertions === "object", "test new model prop assertions");
})

QUnit.test("Object model behaviour for properties", function (assert) {
	var Person = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		name: String,
		age: Number,
		birth: Date,
		female: [Boolean],
		address: {
			work: {
				city: [String]
			}
		}
	});

	var joe = Person({
		name: "Joe",
		age: 42,
		birth: new Date(1990, 3, 25),
		female: false,
		address: {
			work: {
				city: "Lille"
			}
		}
	});

	assert.strictEqual(joe.name, "Joe", "String property retrieved");
	assert.strictEqual(joe.age, 42, "Number property retrieved");
	assert.strictEqual(joe.female, false, "Boolean property retrieved");
	assert.equal(+joe.birth, +(new Date(1990, 3, 25)), "Date property retrieved");
	assert.strictEqual(joe.address.work.city, "Lille", "nested property retrieved");
	assert.ok(joe instanceof Person && joe instanceof Object, "instance is instanceof model and Object");
	assert.ok(Person instanceof __WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */] && Person instanceof Function, "model is instanceof ObjectModel and Function");

	joe.name = "Big Joe";
	joe.age++;
	joe.birth = new Date(1990, 3, 26);
	delete joe.female;

	assert.throws(function () {
		joe.name = 42;
	}, /TypeError.*got Number 42/, "invalid Number set");
	assert.throws(function () {
		joe.age = true;
	}, /TypeError.*got Boolean true/, "invalid Boolean set");
	assert.throws(function () {
		joe.birth = function () {
		};
	}, /TypeError.*got Function/, "invalid Function set");
	assert.throws(function () {
		joe.female = "nope";
	}, /TypeError.*got String "nope"/, "invalid String set");
	assert.throws(function () {
		joe.address.work.city = [];
	}, /TypeError.*got Array/, "invalid Array set");
	assert.throws(function () {
		joe.address.work = {city: 42};
	}, /TypeError.*got Number 42/, "invalid Object set");
	assert.throws(function () {
			joe = Person({
				name: "Joe",
				age: 42,
				birth: new Date(1990, 3, 25),
				female: "false"
			});
		}, /TypeError.*expecting female to be Boolean.*got String "false"/,
		"invalid prop at object model instanciation"
	);

	joe = Person({
		name: "Joe",
		age: 42,
		birth: new Date(1990, 3, 25),
		female: false,
		address: {
			work: {
				city: "Lille"
			}
		},
		job: "Taxi"
	});

	assert.strictEqual(joe.job, "Taxi", "Properties out of model definition are kept but are not validated");

	assert.throws(function () {
		Person({
			name: false,
			age: [42],
			birth: "nope",
			female: null,
			address: {
				work: {
					city: true
				}
			}
		});
	}, function (err) {
		return /TypeError/.test(err.toString())
			&& /name/.test(err.toString())
			&& /age/.test(err.toString())
			&& /birth/.test(err.toString())
			&& /city/.test(err.toString())
	}, "check that errors are correctly stacked");
});

QUnit.test("ObjectModel edge cases of constructors", function (assert) {
	assert.ok(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({}) instanceof __WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */], "ObjectModel can receive empty object as argument");
	assert.throws(function () {
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])()
	}, /Error.*Model definition is required/, "ObjectModel without definition throws")

	/* //TODO
	 assert.throws(function () {
	 ObjectModel(undefined)
	 }, /expecting arguments\[0] to be Object, got undefined/,
	 "ObjectModel with definition undefined throws")

	 assert.throws(function () {
	 ObjectModel(42)
	 }, /expecting arguments\[0] to be Object, got Number 42/,
	 "ObjectModel with definition primitive throws")
	 */
});

QUnit.test("ObjectModel with optional and multiple parameters", function (assert) {
	var Person = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		name: [String],
		age: [Number, Date, String, Boolean, undefined],
		female: [Boolean, Number, String, null],
		haircolor: ["blond", "brown", "black", undefined],
		address: {
			work: {
				city: [String]
			}
		}
	});

	var joe = Person({female: false});
	assert.ok(joe instanceof Person, "instanceof model test");
	joe.name = "joe";
	joe.name = undefined;
	joe.name = null;
	joe.age  = new Date(1995, 1, 23);
	joe.age  = undefined;
	assert.throws(function () {
		joe.age = null;
	}, /TypeError.*got null/, "invalid set null");
	joe.female = "ann";
	joe.female = 2;
	joe.female = false;
	assert.throws(function () {
		joe.female = undefined;
	}, /TypeError.*got undefined/, "invalid set undefined");
	joe.address.work.city = "Lille";
	joe.address.work.city = undefined;
	joe.haircolor         = "blond";
	joe.haircolor         = undefined;
	assert.throws(function () {
		joe.name = false;
	}, /TypeError.*expecting name to be String.*got Boolean false/, "invalid type for optional prop");
	assert.throws(function () {
		joe.age = null;
	}, /TypeError.*expecting age to be Number or Date or String or Boolean or undefined/, "invalid set null for optional union type prop");
	assert.throws(function () {
		joe.age = [];
	}, /TypeError.*got Array/, "invalid set array for optional union type prop");
	assert.throws(function () {
		joe.address.work.city = 0;
	}, /TypeError.*expecting address.work.city to be String.*got Number 0/, "invalid type for nested optional prop");
	assert.throws(function () {
		joe.haircolor = "";
	}, /TypeError.*expecting haircolor to be "blond" or "brown" or "black" or undefined, got String ""/, "invalid type for value enum prop");

});

QUnit.test("ObjectModel with fixed values", function (assert) {
	var myModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		a: [1, 2, 3],
		b: 42,
		c: ["", false, null, 0],
		haircolor: ["blond", "brown", "black"],
		foo: "bar",
		x: [Number, true]
	});

	var model = myModel({
		a: 1,
		b: 42,
		c: 0,
		haircolor: "blond",
		foo: "bar",
		x: true
	});

	model.x         = 666;
	model.haircolor = "brown";

	assert.throws(function () {
		model.a = 4;
	}, /TypeError.*expecting a to be 1 or 2 or 3.*got Number 4/, 'invalid set on values enum 1/2');
	assert.throws(function () {
		model.b = 43;
	}, /TypeError.*expecting b to be 42.*got Number 43/, "invalid set on fixed value 1/2");
	assert.throws(function () {
		model.c = undefined;
	}, /TypeError.*expecting c to be "" or false or null or 0.*got undefined/, "invalid set undefined on mixed typed values enum");
	assert.throws(function () {
		model.haircolor = "roux";
	}, /TypeError.*expecting haircolor to be "blond" or "brown" or "black".*got String "roux"/, 'invalid set on values enum 2/2');
	assert.throws(function () {
		model.foo = "baz";
	}, /TypeError.*expecting foo to be "bar".*got String "baz"/, "invalid set on fixed value 2/2");
	assert.throws(function () {
		model.x = false;
	}, /TypeError.*expecting x to be Number or true.*got Boolean false/, "invalid set on mixed type/values enum");

});

QUnit.test("Object model default values", function (assert) {

	const myModel = new __WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */]({
		name: String,
		foo: {
			bar: {
				buz: Number
			}
		}
	}).defaults({
		name: "joe",
		foo: {
			bar: {
				buz: 0
			}
		}
	});

	const model = myModel();
	assert.strictEqual(model.name, "joe", "defaults values correctly applied");
	assert.strictEqual(model.foo.bar.buz, 0, "defaults nested props values correctly applied");
	assert.ok(myModel.test({}), "defaults should be applied when testing duck typed objects")

	const model2 = myModel({name: "jim", foo: {bar: {buz: 1}}});
	assert.strictEqual(model2.name, "jim", "defaults values not applied if provided");
	assert.strictEqual(model2.foo.bar.buz, 1, "defaults nested props values not applied if provided");

});

QUnit.test("Object model defaultTo with defaults", function (assert) {

	const myModel = new __WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */]({x: Number, y: String})
		.defaultTo({x: 42})
		.defaults({y: "hello"})

	assert.strictEqual(myModel.default.x, 42, "object model defaultTo store the value as default property")
	assert.strictEqual(myModel.prototype.y, "hello", "object model defaults store values to proto")
	assert.strictEqual(myModel().x, 42, "object model default property is applied when undefined is passed");
	assert.strictEqual(myModel().y, "hello", "defaulted object model still inherit from model proto");
	assert.strictEqual(myModel.default.y, undefined, "object model default value itself does not inherit from from model proto");

	myModel.default.x = "nope";

	assert.throws(function () {
		myModel()
	}, /TypeError.*got String "nope"/, "invalid default property still throws TypeError for object models");

});

QUnit.test("RegExp values", function (assert) {

	const myModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		phonenumber: /^[0-9]{10}$/,
		voyels: [/^[aeiouy]+$/]
	});

	const m = myModel({
		phonenumber: "0612345678"
	});

	m.voyels = "ouioui";

	assert.throws(function () {
		m.voyels = "nonnon"
	}, /TypeError/, "regex matching");
	assert.throws(function () {
		m.phonenumber = "123456789"
	}, /TypeError/, "regex matching 2");

});

QUnit.test("Non-enumerable and non-writable properties", function (assert) {

	const myModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		CONST: Number,
		_private: Number,
		normal: Number
	});

	const m = myModel({
		CONST: 42,
		_private: 43,
		normal: 44
	});

	m.normal++;
	m._private++;

	assert.throws(function () {
		m.CONST++;
	}, /TypeError[\s\S]*constant/, "try to redefine constant");
	assert.equal(Object.keys(m).length, 2, "non enumerable key not counted by Object.keys");
	assert.equal(Object.keys(m).includes("_private"), false, "non enumerable key not found in Object.keys");
	assert.equal(Object.getOwnPropertyNames(m).length, 2, "non enumerable key not counted by Object.getOwnPropertyNames");
	assert.equal(Object.getOwnPropertyNames(m).includes("_private"), false, "non enumerable key not found in Object.getOwnPropertyNames");
	assert.equal("normal" in m, true, "enumerable key found with operator in")
	assert.equal("_private" in m, false, "non enumerable key not found with operator in")

});

QUnit.test("Non-enumerable and non-writable properties with overridden convention", function (assert) {

	const myModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		private_prop: Number,
		constant_prop: Number,
		normal_prop: Number
	});

	myModel.conventionForConstant = s => s.indexOf("constant_") === 0;
	myModel.conventionForPrivate  = s => s.indexOf("private_") === 0;

	const m = myModel({
		private_prop: 42,
		constant_prop: 43,
		normal_prop: 44
	});

	assert.throws(function () {
		m.constant_prop++;
	}, /TypeError[\s\S]*constant/, "try to redefine constant with overridden convention");
	assert.equal(Object.keys(m).length, 2, "non enumerable key not counted by Object.keys with overridden convention");
	assert.equal(Object.keys(m).includes("private_prop"), false, "non enumerable key not found in Object.keys with overridden convention");
	assert.equal(Object.getOwnPropertyNames(m).length, 2, "non enumerable key not counted by Object.getOwnPropertyNames with overridden convention");
	assert.equal(Object.getOwnPropertyNames(m).includes("private_prop"), false, "non enumerable key not found in Object.getOwnPropertyNames with overridden convention");
	assert.equal("normal_prop" in m, true, "enumerable key found with operator in with overridden convention")
	assert.equal("private_prop" in m, false, "non enumerable key not found with operator in with overridden convention")

});

QUnit.test("Extensions", function (assert) {

	const Person = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		name: String,
		age: Number,
		birth: Date,
		female: [Boolean],
		address: {
			work: {
				city: [String]
			}
		}
	});

	const joe = Person({
		name: "Joe",
		age: 42,
		birth: new Date(1990, 3, 25),
		female: false,
		address: {
			work: {
				city: "Lille"
			}
		}
	});

	const Woman = Person.extend({female: true});

	assert.ok(Person(joe), "Person valid model for joe");

	assert.throws(function () {
		Woman(joe);
	}, /TypeError[\s\S]*female/, "Woman invalid model for joe");

	assert.throws(function () {
		Woman({
			name: "Joe",
			age: 42,
			birth: new Date(1990, 3, 25),
			female: false,
			address: {
				work: {
					city: "Lille"
				}
			}
		});
	}, /TypeError[\s\S]*female/, "cant be woman from joe parameters");

	assert.throws(function () {
		Woman(joe);
	}, /TypeError[\s\S]*female/, "cant be woman from Person joe");

	const ann = Woman({
		name: "Joe's wife",
		age: 42,
		birth: new Date(1990, 3, 25),
		female: true,
		address: {
			work: {
				city: "Lille"
			}
		}
	});

	const UnemployedWoman = Woman.extend({
		address: {
			work: {
				city: undefined
			}
		}
	});

	assert.ok(Woman(ann), "Woman valid model for ann");

	assert.ok(Woman.prototype.constructor === Woman, "extended model has a new constructor");
	assert.ok(ann.constructor === Woman, "extended model instance has the right constructor");

	assert.throws(function () {
		UnemployedWoman(ann);
	}, /TypeError[\s\S]*city/, "ann cant be UnemployedWoman;  model extension nested undefined property");


	const jane = UnemployedWoman({
		name: "Jane",
		age: 52,
		birth: new Date(1990, 3, 25),
		female: true
	});

	assert.ok(ann instanceof Person, "ann instanceof Person");
	assert.ok(ann instanceof Woman, "ann instanceof Woman");
	assert.ok(jane instanceof Person, "jane instanceof Person");
	assert.ok(jane instanceof Woman, "jane instanceof Woman");
	assert.ok(jane instanceof UnemployedWoman, "jane instanceof UnemployedWoman");
	assert.equal(joe instanceof Woman, false, "joe not instanceof Woman");
	assert.equal(joe instanceof UnemployedWoman, false, "joe not instanceof UnemployedWoman");
	assert.equal(ann instanceof UnemployedWoman, false, "ann not instanceof UnemployedWoman");

	let Vehicle = {speed: Number};
	let Car     = Object.create(Vehicle);
	let Ferrari = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({expensive: true}).extend(Car);
	assert.ok("speed" in Ferrari.definition, "should retrieve definitions from parent prototypes when extending with objects");

	Vehicle = function () {};
	Vehicle.prototype.speed = 99;
	Car = function () {};
	Car.prototype = new Vehicle();
	Ferrari = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({}).extend(Car);

	assert.ok("speed" in new Ferrari(), "should retrieve properties from parent prototypes when extending with constructors");

});

QUnit.test("Multiple inheritance", function (assert) {

	const A = new __WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */]({
		a: Boolean,
		b: Boolean
	});

	const B = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		b: Number,
		c: Number
	});

	const C = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		c: String,
		d: {
			d1: Boolean,
			d2: Boolean
		}
	});

	const D = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		a: String,
		d: {
			d2: Number,
			d3: Number
		}
	});

	let M1 = A.extend(B, C, D);
	let M2 = D.extend(C, B, A);

	assert.equal(Object.keys(M1.definition).sort().join(','), "a,b,c,d", "definition merge for multiple inheritance 1/4");
	assert.equal(Object.keys(M2.definition).sort().join(','), "a,b,c,d", "definition merge for multiple inheritance 2/4");
	assert.equal(Object.keys(M1.definition.d).sort().join(','), "d1,d2,d3", "definition merge for multiple inheritance 3/4");
	assert.equal(Object.keys(M2.definition.d).sort().join(','), "d1,d2,d3", "definition merge for multiple inheritance 4/4");

	let m1 = M1({
		a: "",
		b: 42,
		c: "test",
		d: {
			d1: true,
			d2: 2,
			d3: 3
		}
	});

	let m2 = M2({
		a: false,
		b: false,
		c: 666,
		d: {
			d1: false,
			d2: false,
			d3: 0
		}
	});

	assert.throws(function () {
		m1.a = true;
	}, /TypeError[\s\S]*a/, "type checking multiple inheritance 1/8");
	assert.throws(function () {
		m2.a = "nope";
	}, /TypeError[\s\S]*a/, "type checking multiple inheritance 2/8");
	assert.throws(function () {
		m1.b = !m1.b;
	}, /TypeError[\s\S]*b/, "type checking multiple inheritance 3/8");
	assert.throws(function () {
		m2.b += 7;
	}, /TypeError[\s\S]*b/, "type checking multiple inheritance 4/8");
	assert.throws(function () {
		m1.c = undefined;
	}, /TypeError[\s\S]*c/, "type checking multiple inheritance 5/8");
	assert.throws(function () {
		m2.c = null;
	}, /TypeError[\s\S]*c/, "type checking multiple inheritance 6/8");
	assert.throws(function () {
		m1.d.d2 = true;
	}, /TypeError[\s\S]*d2/, "type checking multiple inheritance 7/8");
	assert.throws(function () {
		m2.d.d2 = 1;
	}, /TypeError[\s\S]*d2/, "type checking multiple inheritance 8/8");

	A.defaults({
		a: false,
		b: false
	});

	B.defaults({
		b: 0,
		c: 0
	});

	C.defaults({
		c: "",
		d: {
			d1: false,
			d2: false
		}
	});

	D.defaults({
		a: "",
		d: {
			d2: 0,
			d3: 0
		}
	});

	M1 = A.extend(B, C, D);
	M2 = D.extend(C, B, A);
	m1 = M1();
	m2 = M2();

	assert.ok(m1.a === "" && m1.b === 0 && m1.c === "" && m1.d.d1 === false && m1.d.d2 === 0 && m1.d.d3 === 0, "defaults checking multiple inheritance 1/2");
	assert.ok(m2.a === false && m2.b === false && m2.c === 0 && m2.d.d1 === false && m2.d.d2 === false && m2.d.d3 === 0, "defaults checking multiple inheritance 2/2");

	function dummyAssert() {
		return true;
	}

	A.assert(dummyAssert);
	B.assert(dummyAssert);
	C.assert(dummyAssert);
	D.assert(dummyAssert);

	M1 = A.extend(B, C, D);
	M2 = D.extend(C, B, A);
	m1 = M1();
	m2 = M2();

	assert.ok(M1.assertions.length === 4, "assertions checking multiple inheritance 1/2");
	assert.ok(M2.assertions.length === 4, "assertions checking multiple inheritance 2/2");

});

QUnit.test("Composition", function (assert) {

	const Person = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		name: String,
		age: [Number, Date],
		female: [Boolean],
		address: {
			work: {
				city: [String]
			}
		}
	});

	const Family = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		father: Person,
		mother: Person.extend({female: true}),
		children: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])(Person),
		grandparents: [__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["b" /* ArrayModel */])(Person).assert(function (persons) {
			return persons && persons.length <= 4
		})]
	});

	const joe = Person({
		name: "Joe",
		age: 42,
		female: false
	});


	const ann = new Person({
		female: true,
		age: joe.age - 5,
		name: joe.name + "'s wife"
	});

	let joefamily = new Family({
		father: joe,
		mother: ann,
		children: []
	});

	assert.ok(joefamily instanceof Family, "joefamily instance of Family");
	assert.ok(joefamily.father instanceof Person, "father instanceof Person");
	assert.ok(joefamily.mother instanceof Person, "mother instanceof Person");

	const duckmother = {
		female: true,
		age: joe.age - 5,
		name: joe.name + "'s wife"
	};

	joefamily = new Family({
		father: joe,
		mother: duckmother,
		children: []
	});

	assert.ok(Person.test(duckmother), "Duck typing for object properties 1/2");
	assert.notOk(duckmother instanceof Person, "Duck typing for object properties 2/2");

	joefamily.mother.name = "Daisy";
	assert.equal(joefamily.mother.name, "Daisy", "Duck typing submodel property can be modified");
	assert.throws(function () {
		joefamily.mother.female = "Quack !";
	}, /TypeError[\s\S]*female/, "validation of submodel duck typed at modification");

	assert.throws(function () {
		new Family({
			father: joe,
			mother: {
				female: false,
				age: joe.age - 5,
				name: joe.name + "'s wife"
			},
			children: []
		});
	}, /TypeError[\s\S]*female/, "validation of submodel duck typed at instanciation");

});

QUnit.test("Object model Assertions", function (assert) {

	const NestedModel = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({foo: {bar: {baz: Boolean}}})
		.assert(o => o.foo.bar.baz === true);

	const nestedModel = NestedModel({foo: {bar: {baz: true}}});

	assert.throws(function () {
		nestedModel.foo.bar.baz = false;
	}, /TypeError/, "test assertion after nested property assignment");

	function assertFail() {
		return false;
	}

	function assertFailWithData() {
		return -1;
	}

	__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */].prototype.assert(assertFail, "expected message without data");
	__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */].prototype.assert(assertFailWithData, function (data) {
		return "expected message with data " + data;
	});

	assert.equal(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */].prototype.assertions.length, 1, "check number of assertions on BasicModel.prototype")
	assert.equal(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */].prototype.assertions.length, 2, "check number of assertions on ObjectModel.prototype");

	const M = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({a: String});

	assert.throws(function () {
		M({a: "test"})
	}, /TypeError/, "expected message without data");

	assert.throws(function () {
		M({a: "test"})
	}, /TypeError/, "expected message with data -1");

	// clean up global assertions
	__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */].prototype.assertions = [];
	delete __WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */].prototype.assertions;

	const AssertObject = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({name: [String]})
		.assert((o => o.name.toLowerCase().length == o.name.length), "may throw exception");

	new AssertObject({name: "joe"});

	assert.throws(function () {
			new AssertObject({name: undefined});
		},
		/assertion \"may throw exception\" returned TypeError.*for value {\s+name: undefined\s+}/,
		"assertions catch exceptions on Object models");

});

QUnit.test("Object models validate method", function (assert) {

	const assertFunction = (c => c === "GB");

	assertFunction.toString = function () {
		return "expected assertFunction toString";
	}

	const Address = new __WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */]({
		city: String,
		country: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["c" /* BasicModel */])(String).assert(assertFunction, "Country must be GB")
	});

	const gbAddress = {city: "London", country: "GB"};
	const frAddress = {city: "Paris", country: "FR"};

	const Order = new __WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */]({
		sku: String,
		address: Address
	});

	const gbOrder = {sku: "ABC123", address: gbAddress};
	const frOrder = {sku: "ABC123", address: frAddress};

	Order.validate(gbOrder); // no errors
	assert.throws(function () {
		Order.validate(frOrder);
	}, "should validate sub-objects assertions");

	const errors = [];
	Order.validate(frOrder, function (err) {
		errors.push(...err);
	});

	assert.equal(errors.length, 1, "should throw exactly one error here")
	assert.equal(errors[0].expected, "expected assertFunction toString", "check assertion error expected parameter");
	assert.equal(errors[0].received, "FR", "check assertion error received parameter");
	assert.equal(errors[0].path, "address.country", "check assertion error path parameter");
	assert.equal(errors[0].message, 'assertion "Country must be GB" returned false for value "FR"', "check assertion error message parameter");

});

QUnit.test("Cyclic detection", function(assert){

	let A, B, a, b;

	A = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({ b: [] });
	B = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({ a: A });
	A.definition.b = [B];

	a = A();
	b = B({ a: a });

	assert.ok(a.b = b, "valid cyclic value assignment");
	assert.throws(function(){a.b = a; }, /TypeError/, "invalid cyclic value assignment");

	A = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({ b: [] });
	B = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({ a: A });

	A.definition.b = {
		c: {
			d: [B]
		}
	};

	a = A();
	b = B({ a: a });

	assert.ok((a.b = { c: { d: b } }), "valid deep cyclic value assignment");
	assert.throws(function(){
		a.b = { c: { d: a } };
	}, /TypeError/, "invalid deep cyclic value assignment");

	const Honey = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		sweetie: [] // Sweetie is not yet defined
	});

	const Sweetie = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		honey: Honey
	});

	Honey.definition.sweetie = [Sweetie];

	const joe = Honey({ sweetie: undefined }); // ann is not yet defined
	const ann = Sweetie({ honey: joe });
	assert.ok(joe.sweetie = ann, "website example valid assignment");
	assert.throws(function(){ joe.sweetie = "dog" }, /TypeError/, "website example invalid assignment 1");
	assert.throws(function(){ joe.sweetie = joe }, /TypeError/, "website example invalid assignment 2");

});

QUnit.test("Custom error collectors for object models", function (assert) {

	assert.expect(11);

	let M = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		a: {
			b: {
				c: true
			}
		}
	});

	M.errorCollector = function (errors) {
		assert.ok(errors.length === 1, "check errors.length model collector");
		var err = errors[0];
		assert.equal(err.expected, true, "check error.expected model collector");
		assert.equal(err.received, false, "check error.received model collector");
		assert.equal(err.path, "a.b.c", "check error.path model collector");
		assert.equal(err.message, 'expecting a.b.c to be true, got Boolean false', "check error message model collector");
	}

	M({
		a: {
			b: {
				c: false
			}
		}
	})

	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({
		d: {
			e: {
				f: null
			}
		}
	}).validate({
		d: {
			e: {
				f: undefined
			}
		}
	}, function (errors) {
		assert.ok(errors.length === 1, "check nested errors.length custom collector");
		var err = errors[0];
		assert.deepEqual(err.expected, null, "check nested error.expected custom collector");
		assert.deepEqual(err.received, undefined, "check nested error.received custom collector");
		assert.equal(err.path, "d.e.f", "check nested error.path custom collector");
		assert.equal(err.message, 'expecting d.e.f to be null, got undefined', "check nested error.message custom collector");
	})

	M = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({x: Number});
	M.errorCollector = function noop() {};

	assert.equal(M.test({x: "nope"}), false, "model.test should work even when errorCollector does not throw exceptions");

});

QUnit.test("Automatic model casting", function (assert) {

	let User = new __WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */]({username: String, email: String})
		.defaults({username: 'foo', email: 'foo@foo'});

	let Article = new __WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */]({title: String, user: User})
		.defaults({title: 'bar', user: new User()});

	let a = new Article();
	a.user = {username: 'joe', email: 'foo'};

	assert.ok(a.user instanceof User, "automatic model casting when assigning a duck typed object");
	assert.ok(a.user.username === "joe", "preserved props after automatic model casting of duck typed object");

	User = new __WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */]({username: String, email: String})
		.defaults({username: 'foo', email: 'foo@foo'});

	Article = new __WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */]({title: String, user: [User]})
		.defaults({title: 'bar', user: new User()});

	a = new Article();
	a.user = {username: 'joe', email: 'foo'};

	assert.ok(a.user instanceof User, "automatic optional model casting when assigning a duck typed object");
	assert.ok(a.user.username === "joe", "preserved props after automatic optional model casting of duck typed object");


	const Type1 = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({ name: String, other1: [Boolean] });
	const Type2 = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({ name: String, other2: [Number] });
	const Container = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__src_index__["a" /* ObjectModel */])({ foo: { bar: [Type1, Type2] }});

	__WEBPACK_IMPORTED_MODULE_1__mocks_console__["a" /* default */].apply();
	let c = new Container({ foo: { bar: { name: "dunno" }}});
	assert.ok(/Ambiguous model for[\s\S]*?name: "dunno"[\s\S]*?other1: \[Boolean\][\s\S]*?other2: \[Number]/
			.test(__WEBPACK_IMPORTED_MODULE_1__mocks_console__["a" /* default */]["warnLastArgs"][0]),
		"should warn about ambiguous model for object sub prop"
	);
	assert.ok(c.foo.bar.name === "dunno", "should preserve values even when ambiguous model cast");
	assert.ok(!(c.foo.bar instanceof Type1 || c.foo.bar instanceof Type2), "should not cast when ambiguous model");
	__WEBPACK_IMPORTED_MODULE_1__mocks_console__["a" /* default */].revert();

	__WEBPACK_IMPORTED_MODULE_1__mocks_console__["a" /* default */].apply();
	c = new Container({ foo: { bar: Type2({ name: "dunno" }) }});
	assert.ok(__WEBPACK_IMPORTED_MODULE_1__mocks_console__["a" /* default */]["warnLastArgs"].length === 0, "should not warn when explicit model cast in ambiguous context");
	assert.ok(c.foo.bar.name === "dunno", "should preserve values when explicit model cast in ambiguous context");
	assert.ok(c.foo.bar instanceof Type2, "should preserve model when explicit cast in ambiguous context");
	__WEBPACK_IMPORTED_MODULE_1__mocks_console__["a" /* default */].revert();

})

/***/ }),
/* 7 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__basic_model__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__helpers__ = __webpack_require__(1);



const ARRAY_MUTATOR_METHODS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"]

function ArrayModel(def){

	const model = function(array = model.default) {
		model.validate(array)
		return new Proxy(array, {
			get(arr, key) {
				if (key === "constructor")
					return model
				else if (ARRAY_MUTATOR_METHODS.includes(key))
					return proxifyArrayMethod(arr, key, model)
				return arr[key]
			},
			set(arr, key, val) {
				setArrayKey(arr, key, val, model)
				return true
			},
			getPrototypeOf(){
				return model.prototype
			}
		})
	}

	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["a" /* setConstructorProto */])(model, Array.prototype)
	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["b" /* initModel */])(model, arguments, ArrayModel)
	return model
}

__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["a" /* setConstructorProto */])(ArrayModel, __WEBPACK_IMPORTED_MODULE_0__basic_model__["c" /* BasicModel */].prototype)
Object.assign(ArrayModel.prototype, {

	toString(stack){
		return 'Array of ' + __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["b" /* toString */])(this.definition, stack)
	},

	_validate(arr, path, errorStack, callStack){
		if(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["c" /* is */])(Array, arr))
			arr.forEach((a,i) => {
				arr[i] = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["d" /* checkDefinition */])(a, this.definition, `${path || "Array"}[${i}]`, errorStack, callStack, true)
			})
		else errorStack.push({
			expected: this,
			received: arr,
			path
		})

		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["e" /* checkAssertions */])(arr, this, path, errorStack)
	}
})

function proxifyArrayMethod(array, method, model){
	return function() {
		const testArray = array.slice()
		Array.prototype[method].apply(testArray, arguments)
		model.validate(testArray)
		const returnValue = Array.prototype[method].apply(array, arguments)
		array.forEach((a,i)=> array[i] = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["f" /* cast */])(a, model.definition))
		return returnValue
	}
}

function setArrayKey(array, key, value, model){
	let path = `Array[${key}]`;
	if(parseInt(key) === +key && key >= 0)
		value = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["d" /* checkDefinition */])(value, model.definition, path, model.errorStack, [], true)

	const testArray = array.slice()
	testArray[key] = value
	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["e" /* checkAssertions */])(testArray, model, path)
	model.unstackErrors()
	array[key] = value
}

/* harmony default export */ __webpack_exports__["a"] = ArrayModel;

/***/ }),
/* 8 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__basic_model__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__helpers__ = __webpack_require__(1);



function FunctionModel(){

	const model = function(fn = model.default) {
		const def = model.definition
		const proxyFn = function () {
			const args = []
			Object.assign(args, def.defaults)
			Object.assign(args, [...arguments])
			if (args.length > def.arguments.length) {
				model.errorStack.push({
					expected: __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["b" /* toString */])(fn) + " to be called with " + def.arguments.length + " arguments",
					received: args.length
				})
			}
			def.arguments.forEach((argDef, i) => {
				args[i] = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["d" /* checkDefinition */])(args[i], argDef, `arguments[${i}]`, model.errorStack, [], true)
			})
			__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["e" /* checkAssertions */])(args, model, "arguments")

			let returnValue
			if(!model.errorStack.length){
				returnValue = fn.apply(this, args)
				if ("return" in def)
					returnValue = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["d" /* checkDefinition */])(returnValue, def.return, "return value", model.errorStack, [], true)
			}
			model.unstackErrors()
			return returnValue
		}
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["f" /* setConstructor */])(proxyFn, model)
		return proxyFn
	}

	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["a" /* setConstructorProto */])(model, Function.prototype)

	const def = { arguments: [...arguments] }
	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["b" /* initModel */])(model, [ def ], FunctionModel)
	return model
}

__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["a" /* setConstructorProto */])(FunctionModel, __WEBPACK_IMPORTED_MODULE_0__basic_model__["c" /* BasicModel */].prototype)

Object.assign(FunctionModel.prototype, {

	toString(stack){
		let out = 'Function(' + this.definition.arguments.map(argDef => __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["b" /* toString */])(argDef, stack)).join(",") +')'
		if("return" in this.definition) {
			out += " => " + __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["b" /* toString */])(this.definition.return)
		}
		return out
	},

	return(def){
		this.definition.return = def
		return this
	},

	defaults(){
		this.definition.defaults = [...arguments]
		return this
	},

	_validate(f, path, errorStack){
		if (!__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["h" /* isFunction */])(f)) {
			errorStack.push({
				expected: "Function",
				received: f,
				path
			})
		}
	}
})

/* harmony default export */ __webpack_exports__["a"] = FunctionModel;

/***/ }),
/* 9 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__basic_model__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__helpers__ = __webpack_require__(1);



const MAP_MUTATOR_METHODS = ["set", "delete", "clear"]

function MapModel(def){

	const model = function(iterable) {
		const map = new Map(iterable)
		model.validate(map)

		for(let method of MAP_MUTATOR_METHODS){
			map[method] = function() {
				const testMap = new Map(map)
				Map.prototype[method].apply(testMap, arguments)
				model.validate(testMap)
				return Map.prototype[method].apply(map, arguments)
			}
		}

		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["f" /* setConstructor */])(map, model)
		return map
	}

	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["a" /* setConstructorProto */])(model, Map.prototype)
	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["b" /* initModel */])(model, arguments, MapModel)
	return model
}

__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["a" /* setConstructorProto */])(MapModel, __WEBPACK_IMPORTED_MODULE_0__basic_model__["c" /* BasicModel */].prototype)
Object.assign(MapModel.prototype, {

	toString(stack){
		return "Map of " + __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["b" /* toString */])(this.definition, stack)
	},

	_validate(map, path, errorStack, callStack){
		if(map instanceof Map){
			for(let [key,val] of map){
				__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["d" /* checkDefinition */])(val, this.definition, `${path || "Map"}[${key}]`, errorStack, callStack)
			}
		} else {
			errorStack.push({
				expected: this,
				received: map,
				path
			})
		}
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["e" /* checkAssertions */])(map, this, errorStack)
	}
})

/* unused harmony default export */ var _unused_webpack_default_export = MapModel;

/***/ }),
/* 10 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__basic_model__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__helpers__ = __webpack_require__(1);



function ObjectModel(def){
	const model = function(obj = model.default) {
		if(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["c" /* is */])(model, obj)) return obj
		if(!__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["c" /* is */])(model, this)) return new model(obj)
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["i" /* merge */])(this, obj, true)
		const proxy = getProxy(model, this, model.definition)
		model.validate(proxy)
		return proxy
	}

	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["a" /* setConstructorProto */])(model, Object.prototype)
	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["b" /* initModel */])(model, arguments, ObjectModel)
	return model
}

__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["a" /* setConstructorProto */])(ObjectModel, __WEBPACK_IMPORTED_MODULE_0__basic_model__["c" /* BasicModel */].prototype)

Object.assign(ObjectModel.prototype, {

	defaults(p){
		Object.assign(this.prototype, p)
		return this
	},

	toString(stack){
		return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["b" /* toString */])(this.definition, stack)
	},

	extend(){
		const def = {}
		const proto = {}
		const args = [...arguments]

		Object.assign(def, this.definition)
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["i" /* merge */])(proto, this.prototype, false, true)
		args.forEach(arg => {
			if(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["c" /* is */])(__WEBPACK_IMPORTED_MODULE_0__basic_model__["c" /* BasicModel */], arg)) __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["i" /* merge */])(def, arg.definition, true)
			if(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["h" /* isFunction */])(arg)) __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["i" /* merge */])(proto, arg.prototype, true, true)
			if(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["j" /* isObject */])(arg)) __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["i" /* merge */])(def, arg, true, true)
		})
		delete proto.constructor;

		let assertions = [...this.assertions]
		args.forEach(arg => {
			if(__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["c" /* is */])(__WEBPACK_IMPORTED_MODULE_0__basic_model__["c" /* BasicModel */], arg)) assertions = assertions.concat(arg.assertions)
		})

		const submodel = new this.constructor(def)
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["a" /* setConstructorProto */])(submodel, this.prototype)
		Object.assign(submodel.prototype, proto)
		submodel.assertions = assertions
		submodel.errorCollector = this.errorCollector
		return submodel
	},

	_validate(obj, path, errorStack, callStack){
		if(!__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["j" /* isObject */])(obj)){
			errorStack.push({
				expected: this,
				received: obj,
				path
			})
		} else {
			__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["d" /* checkDefinition */])(obj, this.definition, path, errorStack, callStack)
		}
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["e" /* checkAssertions */])(obj, this, path, errorStack)
	}
})

function getProxy(model, obj, defNode, path) {
	if(!__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["g" /* isPlainObject */])(defNode)) {
		return __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["f" /* cast */])(obj, defNode)
	}

	return new Proxy(obj || {}, {
		get(o, key) {
			const newPath = (path ? path + '.' + key : key),
			      defPart = defNode[key];
			if(o[key] && o.hasOwnProperty(key) && !__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["g" /* isPlainObject */])(defPart) && !__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["c" /* is */])(__WEBPACK_IMPORTED_MODULE_0__basic_model__["c" /* BasicModel */], o[key].constructor)){
				o[key] = __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["f" /* cast */])(o[key], defPart) // cast nested models
			}
			return getProxy(model, o[key], defPart, newPath)
		},
		set(o, key, val) {
			const newPath = (path ? path + '.' + key : key),
				  isConstant = model.conventionForConstant(key),
				  initialValue = o[key]
			
			if(isConstant && initialValue !== undefined){
				model.errorStack.push({
					message: `cannot redefine constant ${key}`
				})
			}
			if(defNode.hasOwnProperty(key)){
				const newProxy = getProxy(model, val, defNode[key], newPath)
				__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["d" /* checkDefinition */])(newProxy, defNode[key], newPath, model.errorStack, [])
				o[key] = newProxy
				__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["e" /* checkAssertions */])(obj, model, newPath)
			} else {
				model.errorStack.push({
					message: `cannot find property ${newPath} in the model definition`
				})
			}
		
			if(model.errorStack.length){
				o[key] = initialValue
				model.unstackErrors()
			}

			return true
		},
		has(o, key){
			return Reflect.has(o, key) && !model.conventionForPrivate(key)
		},
		ownKeys(o){
			return Reflect.ownKeys(o).filter(key => !model.conventionForPrivate(key))
		},
		getPrototypeOf(){
			return model.prototype
		}
	})
}

/* harmony default export */ __webpack_exports__["a"] = ObjectModel;

/***/ }),
/* 11 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0__basic_model__ = __webpack_require__(0);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1__helpers__ = __webpack_require__(1);



const SET_MUTATOR_METHODS = ["add", "delete", "clear"]

function SetModel(def){

	const model = function(iterable) {
		const _set = new Set(iterable)
		model.validate(_set)

		for(let method of SET_MUTATOR_METHODS){
			_set[method] = function() {
				const testSet = new Set(_set)
				Set.prototype[method].apply(testSet, arguments)
				model.validate(testSet)
				return Set.prototype[method].apply(_set, arguments)
			}
		}

		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["f" /* setConstructor */])(_set, model)
		return _set
	}

	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["a" /* setConstructorProto */])(model, Set.prototype)
	__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["b" /* initModel */])(model, arguments, SetModel)
	return model
}

__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["a" /* setConstructorProto */])(SetModel, __WEBPACK_IMPORTED_MODULE_0__basic_model__["c" /* BasicModel */].prototype)
Object.assign(SetModel.prototype, {

	toString(stack){
		return "Set of " + __webpack_require__.i(__WEBPACK_IMPORTED_MODULE_1__helpers__["b" /* toString */])(this.definition, stack)
	},

	_validate(_set, path, errorStack, callStack){
		if(_set instanceof Set){
			for(let item of _set.values()){
				__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["d" /* checkDefinition */])(item, this.definition, (path || "Set"), errorStack, callStack)
			}
		} else {
			errorStack.push({
				expected: this,
				received: _set,
				path
			})
		}
		__webpack_require__.i(__WEBPACK_IMPORTED_MODULE_0__basic_model__["e" /* checkAssertions */])(_set, this, errorStack)
	}
})

/* unused harmony default export */ var _unused_webpack_default_export = SetModel;

/***/ }),
/* 12 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
const consoleMock = {
	methods: ["debug","log","warn","error"],
	apply: function(){
		consoleMock.methods.forEach(function(method){
			consoleMock["_default"+method] = console[method];
			consoleMock[method+"LastArgs"] = [];
			console[method] = function(){
				consoleMock[method+"LastArgs"] = arguments;
			}
		})
	},
	revert: function(){
		consoleMock.methods.forEach(function(method){
			console[method] = consoleMock["_default"+method];
			consoleMock[method+"LastArgs"] = [];
		});
	}
};

/* harmony default export */ __webpack_exports__["a"] = consoleMock;

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

__webpack_require__(3);
__webpack_require__(4);
__webpack_require__(5);
module.exports = __webpack_require__(6);


/***/ })
/******/ ]);