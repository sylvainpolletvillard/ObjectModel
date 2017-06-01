/* global MapModel, ObjectModel */

QUnit.module("Map Models");

QUnit.test("Map model constructor && proto", function (assert) {

	assert.ok(MapModel instanceof Function, "MapModel instanceof Function");

	const Dict = MapModel(String, Number);

	assert.ok(Dict instanceof MapModel, "Map models can be declared");

	assert.ok(typeof Dict.extend === "function", "test Map model method extend");
	assert.ok(typeof Dict.assert === "function", "test Map model method assert");
	assert.ok(typeof Dict.test === "function", "test Map model method test");
	assert.ok(typeof Dict.validate === "function", "test Map model method validate");
	assert.ok(Dict.definition.key === String, "test Map model prop definition 1/2");
	assert.ok(Dict.definition.value === Number, "test Map model prop definition 2/2");
	assert.ok(typeof Dict.assertions === "object", "test Map model prop assertions");

});

QUnit.test("Map model instanciation && mutation methods watchers", function (assert) {

	const Dict = MapModel(String, Number).assert(m => m.size >= 2, "minsize assert");
	const m = Dict([["one", 1], ["two", 2]]);

	assert.ok(m instanceof Dict && m instanceof Map, "Map models can be instanciated");

	m.set("three", 3);

	assert.throws(function () {
		m.set("four", "4");
	}, /TypeError.*four/, "set calls are catched");

	assert.equal(m.size, 3, "map size change is ok 1/2");

	m.delete("three");
	assert.throws(function () {
		m.delete("two");
	}, /TypeError.*minsize assert/, "delete calls are catched");

	assert.throws(function () {
		m.clear();
	}, /TypeError.*minsize assert/, "clear calls are catched");

	assert.equal(m.size, 2, "map size change is ok 2/2");

});

QUnit.test("Map model validation in constructor", function (assert) {

	const Dict = MapModel(String, Number)
	const m = Dict([ ["one", 1], ["two", 2] ]);
	assert.equal(m.size, 2, "map size is ok");

	assert.throws(function () {
		Dict(["one", 1], [1, 2]);
	}, /TypeError/, "validation in map model constructor 1/2");

	assert.throws(function () {
		Dict(["one", 1], ["two", "2"]);
	}, /TypeError/, "validation in map model constructor 2/2");

});

QUnit.test("Map model with union types & submodels", function (assert) {

	const Question = ObjectModel({ question: String })
	const Answer = ObjectModel({ answer: Number })

	const Dict = MapModel([Question, String], [Answer, String, Boolean]);
	const m   = Dict([ ["test", "test"] ]);
	m.set("is it real life ?", true);
	m.set(Question({ question: "life universe and everything" }), Answer({ answer: 42 }));
	m.set("another one with autocast", {answer: 43});
	assert.throws(function () {
		m.set(42, false);
	}, /TypeError.*42/, "map set multiple types for keys");
	assert.throws(function () {
		m.set("test", 42)
	}, /TypeError.*test/, "map set multiple types for values");

})
/*
QUnit.test("Map model with union types & fixed values", function (assert) {

	const Dict = MapModel([true, 2, "3"], [4, "5"]);
	assert.throws(function () {
		Dict(["3", 4], ["2", "5"]);
	}, /TypeError[\s\S]*Map\[3]/, "MapModel fixed values");

	const Cards     = ArrayModel([Number, "J", "Q", "K"]); // array of Numbers, J, Q or K
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

	const Child  = ObjectModel({arr: ArrayModel(String)});
	const Parent = ObjectModel({child: Child});

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

	assert.ok(ArrayModel(undefined) instanceof ArrayModel, "ArrayModel can receive undefined as argument");
	assert.throws(function () {
		ArrayModel()
	}, /Error.*Model definition is required/, "ArrayModel without definition throws")

});

QUnit.test("Array model defaults values", function (assert) {

	const ArrModel = ArrayModel([Number, String]).defaultTo([]);
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

	const ArrayMax3 = ArrayModel(Number).assert(function maxRange(arr){ return arr.length <= 3; });
	let arr = ArrayMax3([1,2]);

	arr.push(3);
	assert.throws(function(){ arr.push(4); }, /TypeError[\s\S]*maxRange/, "test assertion after array method");

	const ArraySumMax10 = ArrayModel(Number).assert(function(arr){
		return arr.reduce(function(a,b){ return a+b; },0) <= 10;
	});

	arr = ArraySumMax10([2,3,4]);
	assert.throws(function(){ arr[1] = 7; }, /TypeError/, "test assertion after array key assignment");

	const AssertArray = ArrayModel(Number).assert(v => v.length >= 0, "may throw exception");

	new AssertArray([]);

	assert.throws(function(){ new AssertArray(); },
		/assertion \"may throw exception\" returned TypeError.*for value undefined/,
		"assertions catch exceptions on Array models");

})

QUnit.test("Automatic model casting in array models", function (assert) {

	const N = ObjectModel({ x: Number, y: [Number] }).defaults({ x: 5, y: 7 });
	const Arr = ArrayModel(N);
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

QUnit.test("Other traps", function(assert){

	const Arr = ArrayModel(Number);
	const a = Arr([ 1, 2, 3 ])

	delete a.unknownProperty;
	delete a[3];

	assert.throws(function(){
		delete a[2]
	}, /TypeError/, "deleteProperty trap block array holes if def != undefined")

	const ArrB = ArrayModel([Number]);
	const b = ArrB([ 1, 2, 3 ])

	delete b[2]
	assert.equal(b[2], undefined, "deleteProperty trap does not block when def is optional")
})*/