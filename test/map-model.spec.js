/* global QUnit, MapModel, ObjectModel */

QUnit.module("Map Models");

QUnit.test("constructor && proto", function (assert) {

	assert.ok(MapModel instanceof Function, "MapModel instanceof Function");

	const Dict = MapModel(String, Number);

	assert.ok(Dict instanceof MapModel, "Map models can be declared");

	assert.ok(typeof Dict.extend === "function", "test Map model method extend");
	assert.ok(typeof Dict.assert === "function", "test Map model method assert");
	assert.ok(typeof Dict.test === "function", "test Map model method test");
	assert.ok(Dict.definition.key === String, "test Map model prop definition 1/2");
	assert.ok(Dict.definition.value === Number, "test Map model prop definition 2/2");
	assert.ok(typeof Dict.assertions === "object", "test Map model prop assertions");

	assert.ok(MapModel(undefined, undefined) instanceof MapModel, "MapModel can receive undefined as argument");
});

QUnit.test("instanciation && mutation methods watchers", function (assert) {

	const Dict = MapModel(String, Number).assert(m => m.size >= 2, "minsize assert");
	const m = Dict([["one", 1], ["two", 2]]);

	assert.ok(m instanceof Dict && m instanceof Map, "Map models can be instanciated");

	m.set("three", 3);

	assert.equal(m.set.name, "set", "proxyfied methods keep original properties");

	assert.throws(function () {
		m.set("four", "4");
	}, /TypeError.*expecting Map.set arguments\[1] to be Number, got String "4"/, "set calls are catched");

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

QUnit.test("validation in constructor", function (assert) {

	const Dict = MapModel(String, Number)
	const m = Dict([["one", 1], ["two", 2]]);
	assert.equal(m.size, 2, "map size is ok");

	assert.throws(function () {
		Dict(["one", 1], [1, 2]);
	}, /TypeError/, "validation in map model constructor 1/2");

	assert.throws(function () {
		Dict(["one", 1], ["two", "2"]);
	}, /TypeError/, "validation in map model constructor 2/2");

});

QUnit.test("union types & submodels", function (assert) {

	const Question = ObjectModel({ question: String })
	const Answer = ObjectModel({ answer: Number })

	const Dict = MapModel([Question, String], [Answer, String, Boolean]);
	const m = Dict([["test", "test"]]);
	m.set("is it real life ?", true);
	m.set(Question({ question: "life universe and everything" }), Answer({ answer: 42 }));
	m.set("another one with autocast", { answer: 43 });
	assert.throws(function () {
		m.set(42, false);
	}, /TypeError.*expecting Map.set arguments\[0] to be.*[\s\S]*Number 42/, "map set multiple types for keys");
	assert.throws(function () {
		m.set("test", 42)
	}, /TypeError.*expecting Map.set arguments\[1] to be.*[\s\S]*Number 42/, "map set multiple types for values");

})

QUnit.test("union types & fixed values", function (assert) {

	const DictA = MapModel([true, 2, "3"], [4, "5"]);
	assert.throws(function () {
		DictA([["3", 4], ["2", "5"]]);
	}, /TypeError.*expecting Map key to be true or 2 or "3", got String "2"/, "MapModel fixed values");

	DictA([[true, 4], [2, "5"]]);
	const DictB = DictA.extend().assert(m => m.size === 2);
	const dictB = new DictB([[2, 4], ["3", "5"]]);

	assert.ok(Object.getPrototypeOf(DictB.prototype) === DictA.prototype, "extension respect prototypal chain");
	assert.ok(dictB instanceof DictB && dictB instanceof DictA, "map model inheritance");
	DictA([[true, 4], [2, "5"]]).set("3", 4);
	assert.throws(function () {
		DictB([[true, 4], [2, "5"]]).set("3", 4);
	}, /TypeError/, "min/max of inherit map model");

	const DictC = DictB.extend("new", "val");
	DictC([["new", "5"], [true, "val"]]);
	assert.throws(function () {
		DictB([["new", "5"], ["3", 4]]);
	}, /TypeError/, "map model type extension 1/2");
	assert.throws(function () {
		DictB([["3", 4], [true, "val"]]);
	}, /TypeError/, "map model type extension 2/2");

})

QUnit.test("Child map models in object models", function (assert) {

	const Child = ObjectModel({ map: MapModel(Number, String) });
	const Parent = ObjectModel({ child: Child });

	const childO = Child({ map: new Map([[1, "one"], [2, "two"]]) });
	assert.ok(childO.map instanceof Map, "child map model is instanceof Map");
	const parentO = Parent({ child: childO });
	assert.ok(parentO.child.map instanceof Map, "child map model from parent is Map");

	childO.map.set(3, "three");
	assert.throws(function () {
		childO.map.set(4, false);
	}, /TypeError/, "child map model catches invalid set value");
	assert.throws(function () {
		childO.map.set("four", "four");
	}, /TypeError/, "child map model catches invalid set key");

});

QUnit.test("default values", function (assert) {

	const M = MapModel(Number, String).defaultTo(new Map([[1, "one"], [2, "two"]]));
	const a = M();

	assert.ok(a instanceof Map && a.size === 2, "Map model default value");

	M.default.set(3, "three");

	const b = M();

	assert.ok(b.size === 3 && Array.from(b.keys()).sort().join(";") === "1;2;3", "map model default value is mutable");

	M.default = "nope";

	assert.throws(function () {
		M()
	}, /TypeError/, "invalid default property still throws TypeError for map models");

})

QUnit.test("assertions", function (assert) {

	const MapMax3 = MapModel(Number, String).assert(function maxEntries(map) {
		return map.size <= 3;
	});
	let map = MapMax3([[1, "one"], [2, "two"]]);

	map.set(3, "three");
	assert.throws(function () {
		map.set(4, "four");
	}, /TypeError[\s\S]*maxEntries/, "test assertion after map method");

	const AssertMap = MapModel(Number, Number).assert(m => m.size > 0, "may throw exception");

	new AssertMap([[1, 2]]);

	assert.throws(function () { new AssertMap([]); },
		/assertion "may throw exception" returned false.*for Map = \[]/,
		"assertions catch exceptions on Map models"
	);

})

QUnit.test("Automatic model casting", function (assert) {

	const X = ObjectModel({ x: Number }).defaultTo({ x: 5 })
	const Y = ObjectModel({ y: [Number] }).defaultTo({ y: 7 });
	const M = MapModel(X, Y);
	const m = M([[{ x: 9 }, {}]]);

	assert.ok(Array.from(m.keys())[0] instanceof X, "test automatic model casting with map init 1/3")
	assert.ok(Array.from(m.values())[0] instanceof Y, "test automatic model casting with map init 2/3")
	let [k, v] = Array.from(m.entries())[0];
	assert.equal(k.x * v.y, 63, "test automatic model casting with map init 3/3")

	m.set({ x: 3 }, { y: 4 })

	assert.ok(Array.from(m.keys())[1] instanceof X, "test automatic model casting with map mutator method 1/3")
	assert.ok(Array.from(m.values())[1] instanceof Y, "test automatic model casting with map mutator method 2/3");

	[k, v] = Array.from(m.entries())[1];
	assert.equal(k.x * v.y, 12, "test automatic model casting with map mutator method 3/3")
});

QUnit.test("toString", function (assert) {
	assert.equal(MapModel(Number, String).toString(), "Map of Number : String")
	assert.equal(MapModel(Date, [String, 42]).toString(), "Map of Date : (String or 42)")
})

QUnit.test("dynamic definition", function (assert) {
	let M = MapModel(String, String);
	let m1 = M([["hello", "world"]])
	M.definition.key = Number;
	M.definition.value = Number;
	let m2 = M([[1, 1], [2, 1], [3, 2], [4, 3], [5, 5]])
	assert.equal(M.test(m1), false, "definition can be dynamically changed 1/4")
	assert.equal(M.test(m2), true, "definition can be dynamically changed 2/4")
	m1.clear();
	assert.throws(() => m1.set("hello", "world"), /TypeError/, "definition can be dynamically changed 3/4")
	m1.set(0, 42);
	assert.equal(m1.get(0), 42, "definition can be dynamically changed 4/4")

	let OM = ObjectModel({ n: Number });
	M.definition.value = OM;
	m1.clear();
	m1.set(1, { n: 42 });
	assert.ok(m1.get(1) instanceof OM, "autocast still works after definition dynamically changed")
})