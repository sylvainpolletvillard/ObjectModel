/* global QUnit, ArrayModel, ObjectModel */

QUnit.module("Array Models");

QUnit.test("constructor && proto", function (assert) {

	assert.ok(ArrayModel instanceof Function, "ArrayModel instanceof Function");

	const Arr = ArrayModel(Number);

	assert.ok(Arr instanceof ArrayModel, "Array models can be declared");

	assert.ok(typeof Arr.extend === "function", "test Array model method extend");
	assert.ok(typeof Arr.assert === "function", "test Array model method assert");
	assert.ok(typeof Arr.test === "function", "test Array model method test");
	assert.ok(Arr.definition === Number, "test Array model prop definition");
	assert.ok(typeof Arr.assertions === "object", "test Array model prop assertions");

	assert.ok(ArrayModel(undefined) instanceof ArrayModel, "ArrayModel can receive undefined as argument");
});

QUnit.test("instanciation && mutation methods watchers", function (assert) {

	const Arr = ArrayModel(Number);
	const a = Arr([]);

	assert.ok(a instanceof Arr && a instanceof Array, "Array models can be instanciated");

	assert.equal(a.push.name, "push", "proxyfied methods keep original properties");

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

QUnit.test("validation in constructor", function (assert) {

	const Arr = ArrayModel(Number);
	const b = Arr([1, 2, 3]);
	assert.equal(b.length, 3, "array.length is ok");

	assert.throws(function () {
		Arr([1, false, 3]);
	}, /TypeError/, "validation in array model constructor 1/2");

	assert.throws(function () {
		Arr([1, 2, 3, function () {
		}]);
	}, /TypeError/, "validation in array model constructor 2/2");

});

QUnit.test("union types & submodels", function (assert) {

	const Question = ObjectModel({
		answer: Number
	});

	const Arr = ArrayModel([Question, String, Boolean]);
	const a = Arr(["test"]);
	a.unshift(true);
	a.push(Question({ answer: 42 }));
	a.push({ answer: 43 });
	assert.throws(function () {
		a.unshift(42);
	}, /TypeError/, "unshift multiple types");
	assert.throws(function () {
		a[0] = null;
	}, /TypeError/, "set index multiple types");

})

QUnit.test("union types & fixed values", function (assert) {

	const Arr = ArrayModel([true, 2, "3"]);
	assert.throws(function () {
		Arr(["3", 2, true, 1]);
	}, /TypeError[\s\S]*Array\[3]/, "ArrayModel fixed values");

	const Cards = ArrayModel([Number, "J", "Q", "K"]); // array of Numbers, J, Q or K
	const Hand = Cards.extend().assert(cards => cards.length === 2);
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

	const Child = ObjectModel({ arr: ArrayModel(String) });
	const Parent = ObjectModel({ child: Child });

	const childO = Child({ arr: ["a", "b", "c"] });
	assert.ok(childO.arr instanceof Array, "child array model is array");
	const parentO = Parent({ child: childO });
	assert.ok(parentO.child.arr instanceof Array, "child array model from parent is array");

	childO.arr.push("a");
	assert.throws(function () {
		childO.arr.push(false);
	}, /TypeError/, "child array model catches push calls");
	assert.throws(function () {
		childO.arr[0] = 1;
	}, /TypeError/, "child array model catches set index");

});

QUnit.test("default values", function (assert) {

	const ArrModel = ArrayModel([Number, String]).defaultTo([]);
	const a = ArrModel();

	assert.ok(a instanceof Array && a.length === 0, "Array model default value");
	a.push(1, 2);

	const b = ArrModel();
	assert.ok(b instanceof Array && b.length === 0, "Avoid default value common reference issue for Array models");

	ArrModel.default.push(1, 2, 3);

	const c = ArrModel();

	assert.ok(c.length === 3 && c.join(";") === "1;2;3", "array model default value is mutable array");

	ArrModel.default = "nope";

	assert.throws(function () {
		ArrModel()
	}, /TypeError.*got String "nope"/, "invalid default property still throws TypeError for array models");

})

QUnit.test("validate defaut values provided", function (assert) {
	assert.throws(function () {
		ArrayModel(Number).defaultTo()
	}, /TypeError.*expecting Array of Number, got undefined*/, "invalid default value provided: undefined");
	assert.throws(function () {
		ArrayModel(String).defaultTo("test")
	}, /TypeError.*expecting Array of String, got String \"test\"*/, "invalid default value provided: wrong type");
})

QUnit.test("Assertions", function (assert) {

	const ArrayMax3 = ArrayModel(Number).assert(function maxRange(arr) { return arr.length <= 3; });
	let arr = ArrayMax3([1, 2]);

	arr.push(3);
	assert.throws(function () { arr.push(4); }, /TypeError[\s\S]*maxRange/, "test assertion after array method");

	const ArraySumMax10 = ArrayModel(Number).assert(function (arr) {
		return arr.reduce(function (a, b) { return a + b; }, 0) <= 10;
	});

	arr = ArraySumMax10([2, 3, 4]);
	assert.throws(function () { arr[1] = 7; }, /TypeError/, "test assertion after array key assignment");

	const AssertArray = ArrayModel(Number).assert(v => v.length >= 0, "may throw exception");

	new AssertArray([]);

	assert.throws(function () { new AssertArray(); },
		/assertion "may throw exception" returned TypeError.*for value undefined/,
		"assertions catch exceptions on Array models");

})

QUnit.test("Automatic model casting", function (assert) {

	const N = ObjectModel({ x: Number, y: [Number] }).defaultTo({ x: 5, y: 7 });
	const Arr = ArrayModel(N);
	const a = Arr([{ x: 9 }]);

	assert.ok(a[0] instanceof N, "test automatic model casting with array init 1/2")
	assert.equal(a[0].x * a[0].y, 63, "test automatic model casting with array init 2/2")

	a.push({ x: 3 });

	assert.ok(a[1] instanceof N, "test automatic model casting with array push method 1/2")
	assert.equal(a[1].x * a[1].y, 21, "test automatic model casting with array push method 2/2")

	a.splice(1, 1, { x: 4 });

	assert.ok(a[1] instanceof N, "test automatic model casting with array splice method 1/2")
	assert.equal(a[1].x * a[1].y, 28, "test automatic model casting with array splice method 2/2")

	a.fill({ x: 5 })

	assert.ok(a[1] instanceof N, "test automatic model casting with array fill method 1/2")
	assert.equal(a[1].x * a[1].y, 35, "test automatic model casting with array fill method 2/2")

	a.unshift({ x: 1 }, { x: 6 })

	assert.ok(a[1] instanceof N, "test automatic model casting with array unshift method 1/2")
	assert.equal(a[1].x * a[1].y, 42, "test automatic model casting with array unshift method 2/2")

	a[0] = { x: 10 };

	assert.ok(a[0] instanceof N, "test automatic model casting with array set index 1/2")
	assert.equal(a[0].x * a[0].y, 70, "test automatic model casting with array set index 2/2");

});

QUnit.test("Other traps", function (assert) {

	const Arr = ArrayModel(Number);
	const a = Arr([1, 2, 3])

	delete a.unknownProperty;
	delete a[3];

	assert.throws(function () {
		delete a[2]
	}, /TypeError/, "deleteProperty trap block array holes if def != undefined")

	const ArrB = ArrayModel([Number]);
	const b = ArrB([1, 2, 3])

	delete b[2]
	assert.equal(b[2], undefined, "deleteProperty trap does not block when def is optional")
})

QUnit.test("toString", function (assert) {
	assert.equal(ArrayModel(Number).toString(), "Array of Number", "ArrayModels toString for basic elements")
	assert.equal(ArrayModel([String, 42]).toString(), "Array of String or 42", "ArrayModels toString for union type elements")
})

QUnit.test("Dynamic definition", function (assert) {
	let A = ArrayModel(String);
	let a1 = A(["hello", "world"])
	A.definition = Number;
	let a2 = A([1, 2, 3])
	assert.equal(A.test(a1), false, "definition can be dynamically changed 1/4")
	assert.equal(A.test(a2), true, "definition can be dynamically changed 2/4")
	a1.splice(0, a1.length);
	assert.throws(() => a1.push("hello"), /TypeError/, "definition can be dynamically changed 3/4")
	a1.push(42);
	assert.equal(a1[0], 42, "definition can be dynamically changed 4/4")

	let OM = ObjectModel({ n: Number });
	A.definition = OM;
	a1.splice(0, a1.length);
	a1.push({ n: 42 });
	assert.ok(a1[0] instanceof OM, "autocast still works after definition dynamically changed")
})

QUnit.test("delete key", function (assert) {
	let A = ArrayModel([Number]);
	let a = A([1, 2, 3])
	delete a[2]
	assert.equal(3 in a, false, "delete should remove own array key")
	assert.equal(a.length, 3, "delete should not update length")
	assert.equal(Object.keys(a).length, 2, "delete should leave an empty hole")

	const ArrayDense = ArrayModel([Number]).assert(function hasNoHoles(arr) {
		return arr.filter(() => true).length === arr.length
	}).as("ArrayDense");

	A = ArrayDense.extend([Number]);
	a = A([4, 5, 6])
	assert.throws(() => {
		delete a[2]
	}, /TypeError.*hasNoHoles/, "ArrayDense should prevent deleting keys")

})

QUnit.test("Arraymodel as ObjectModel default prop", function (assert) {
	class OM extends ObjectModel({
		a: ArrayModel(Number)
	}).defaultTo({
		a: []
	}) { }

	let o = new OM();

	assert.ok(Array.isArray(o.a), "ArrayModel works as ObjectModel default prop")
	o.a.push(1, 2, 3)
	assert.equal(o.a.length, 3, "ArrayModel as ObjectModel default prop can be mutated")

})