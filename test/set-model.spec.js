/* global QUnit, SetModel, ObjectModel */

QUnit.module("Set Models");

QUnit.test("constructor && proto", function (assert) {

	assert.ok(SetModel instanceof Function, "SetModel instanceof Function");

	const MySet = SetModel(String);

	assert.ok(MySet instanceof SetModel, "Set models can be declared");

	assert.ok(typeof MySet.extend === "function", "test Set model method extend");
	assert.ok(typeof MySet.assert === "function", "test Set model method assert");
	assert.ok(typeof MySet.test === "function", "test Set model method test");
	assert.ok(MySet.definition === String, "test Set model prop definition");
	assert.ok(typeof MySet.assertions === "object", "test Set model prop assertions");

	assert.ok(SetModel(undefined) instanceof SetModel, "SetModel can receive undefined as argument");

});

QUnit.test("instanciation && mutation methods watchers", function (assert) {

	const S = SetModel(Number).assert(s => s.size >= 2, "minsize assert");
	const s = S([1, 2]);

	assert.ok(s instanceof S && s instanceof Set, "Set models can be instanciated");

	s.add(3);

	assert.equal(s.add.name, "add", "proxyfied methods keep original properties");

	assert.throws(function () {
		s.add("four")
	}, /TypeError.*four/, "add calls are catched");

	assert.equal(s.size, 3, "set size change is ok 1/2");

	s.delete(3);
	assert.throws(function () {
		s.delete(2);
	}, /TypeError.*minsize assert/, "delete calls are catched");

	assert.throws(function () {
		s.clear();
	}, /TypeError.*minsize assert/, "clear calls are catched");

	assert.equal(s.size, 2, "set size change is ok 2/2");

});

QUnit.test("validation in constructor", function (assert) {

	const S = SetModel(String)
	const s = S(["one", "two"]);
	assert.equal(s.size, 2, "set size is ok");

	assert.throws(function () {
		S(["one", 2])
	}, /TypeError/, "validation in set model constructor 1/2");

	assert.throws(function () {
		S([1, "two"])
	}, /TypeError/, "validation in set model constructor 2/2");

});

QUnit.test("union types & submodels", function (assert) {

	const Question = ObjectModel({
		answer: Number
	});

	const Quiz = SetModel([Question, String, Boolean]);
	const s = Quiz(["test", true, { answer: 42 }]);
	s.add("is it real life ?");
	s.add(true);
	s.add({ answer: 43 });
	assert.throws(function () {
		s.add(42);
	}, /TypeError[\s\S]*got Number 42/m, "set invalid type on union type");

});

QUnit.test("union types & fixed values", function (assert) {

	const S = SetModel([true, 2, "3"]);
	assert.throws(function () {
		S(["3", 4]);
	}, /TypeError[\s\S]*Set.*Number 4/, "SetModel fixed values");

	S([2, true]);
	const S2 = S.extend().assert(s => s.size === 2);
	const s2 = new S2([2, '3']);

	assert.ok(Object.getPrototypeOf(S2.prototype) === S.prototype, "extension respect prototypal chain");
	assert.ok(s2 instanceof S2 && s2 instanceof S, "set model inheritance");
	S([2, true]).add("3");
	assert.throws(function () {
		S2([2, true]).add("3")
	}, /TypeError/, "min/max of inherit set model");

	const S3 = S2.extend("new", "val");
	S3(["val", true]);
	S3([true, "new"]);
	assert.throws(function () {
		S2(["val", true]);
	}, /TypeError/, "set  model type extension");

})

QUnit.test("Child set models in object models", function (assert) {

	const Child = ObjectModel({ set: SetModel(Number) });
	const Parent = ObjectModel({ child: Child });

	const childO = Child({ set: new Set([1, 2, 3, 5, 8]) });
	assert.ok(childO.set instanceof Set, "child set model is instanceof Set");
	const parentO = Parent({ child: childO });
	assert.ok(parentO.child.set instanceof Set, "child set model from parent is Set");

	childO.set.add(13);
	assert.throws(function () {
		childO.set.add("21");
	}, /TypeError/, "child array model catches invalid set value");

});

QUnit.test("defaults values", function (assert) {

	const S = SetModel(Number).defaultTo(new Set([1, 2]));
	const a = S();

	assert.ok(a instanceof Set && a.size === 2, "Set model default value");

	S.default.add(3);

	const b = S();

	assert.ok(b.size === 3 && Array.from(b.values()).sort().join(";") === "1;2;3", "set model default value is mutable");

	S.default = "nope";

	assert.throws(function () {
		S()
	}, /TypeError/, "invalid default property still throws TypeError for set models");

})

QUnit.test("assertions", function (assert) {

	const SetMax3 = SetModel(String).assert(function maxEntries(set) {
		return set.size <= 3;
	});

	let set = SetMax3(["one", "two"]);

	set.add("three");
	assert.throws(function () {
		set.add("four");
	}, /TypeError[\s\S]*maxEntries/, "test assertion after set method");

	const AssertSet = SetModel(Number).assert(s => s.size > 0, "may throw exception");

	new AssertSet([1, 2]);

	assert.throws(function () { new AssertSet([]); },
		/assertion "may throw exception" returned false.*for value \[]/,
		"assertions catch exceptions on Set models"
	);

})

QUnit.test("Automatic model casting", function (assert) {

	const N = ObjectModel({ x: Number, y: [Number] }).defaultTo({ x: 5, y: 7 });
	const S = SetModel(N);
	const s = S([{ x: 9 }]);

	let n = Array.from(s.values())[0];
	assert.ok(n instanceof N, "test automatic model casting with set init 1/2")
	assert.equal(n.x * n.y, 63, "test automatic model casting with set init 2/2")

	s.add({ x: 3 });
	n = Array.from(s.values())[1];

	assert.ok(n instanceof N, "test automatic model casting with array mutator method 1/2")
	assert.equal(n.x * n.y, 21, "test automatic model casting with array mutator method 2/2")
});

QUnit.test("toString", function (assert) {
	assert.equal(SetModel(Number).toString(), "Set of Number", "SetModel toString for basic elements")
	assert.equal(SetModel([String, 42]).toString(), "Set of String or 42", "SetModel toString for union type elements")
})

QUnit.test("dynamic definition", function (assert) {
	let S = SetModel(String);
	let s1 = S(["hello", "world"])
	S.definition = Number;
	let s2 = S([1, 2, 3])
	assert.equal(S.test(s1), false, "definition can be dynamically changed 1/4")
	assert.equal(S.test(s2), true, "definition can be dynamically changed 2/4")
	s1.clear();
	assert.throws(() => s1.add("hello"), /TypeError/, "definition can be dynamically changed 3/4")
	s1.add(42);
	assert.ok(s1.has(42), "definition can be dynamically changed 4/4")

	let OM = ObjectModel({ n: Number });
	S.definition = OM;
	s1.clear();
	s1.add({ n: 42 });
	assert.ok([...s1][0] instanceof OM, "autocast still works after definition dynamically changed")
})