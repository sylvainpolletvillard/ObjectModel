/* global QUnit, ArrayModel, ObjectModel, FunctionModel */

QUnit.module("Function Models");

QUnit.test("constructor && proto", function (assert) {

	assert.equal(typeof FunctionModel, "function", "FunctionModel is defined");

	const Operation = FunctionModel(Number, Number).return(Number);

	assert.ok(Operation instanceof FunctionModel, "model instance of FunctionModel");

	assert.ok(typeof Operation.extend === "function", "test Function model method extend");
	assert.ok(typeof Operation.assert === "function", "test Function model method assert");
	assert.ok(typeof Operation.test === "function", "test Function model method test");
	assert.ok(typeof Operation.return === "function", "test Function model method return");
	assert.equal(Operation.definition.arguments.map(a => a.name).join(','),
		'Number,Number', "test Function model prop definition");
	assert.ok(Operation.definition.return === Number, "test Function model prop return");
	assert.ok(typeof Operation.assertions === "object", "test Function model prop assertions");

});

QUnit.test("instanciation and controls", function (assert) {

	const op = FunctionModel(Number, Number).return(Number);

	const add = op(function (a, b) { return a + b; });
	const noop = op(function () { return undefined; });
	const addStr = op(function (a, b) { return String(a) + String(b); });

	assert.ok(add instanceof Function && add instanceof op, "fn instanceof functionModel and Function");

	assert.equal(add(15, 25), 40, "valid function model call");
	assert.throws(function () {
		add(15)
	}, /TypeError/, "too few arguments");
	assert.throws(function () {
		noop(15, 25)
	}, /TypeError/, "no return");
	assert.throws(function () {
		addStr(15, 25)
	}, /TypeError/, "incorrect return type");

});

QUnit.test("object models methods", function (assert) {

	const Person = ObjectModel({
		name: String,
		age: Number,
		// function without arguments returning a String
		sayMyName: FunctionModel().return(String)
	}).defaultTo({
		sayMyName: function () {
			return "my name is " + this.name;
		}
	});

	const greetFnModel = FunctionModel(Person).return(String);

	Person.prototype.greet = greetFnModel(function (otherguy) {
		return "Hello " + otherguy.name + ", " + this.sayMyName();
	});

	const joe = new Person({ name: "Joe", age: 28 });
	const ann = new Person({ name: "Ann", age: 23 });

	assert.equal(joe.sayMyName(), "my name is Joe", "valid function model method call 1/2");
	assert.equal(joe.greet(ann), "Hello Ann, my name is Joe", "valid function model method call 2/2");

	assert.throws(function () {
		joe.greet("dog");
	}, /TypeError/, "invalid argument type");

});

QUnit.test("default arguments & arguments control", function (assert) {

	const Calculator = FunctionModel(Number, ["+", "-", "*", "/", undefined], [Number])
		.return(Number);

	const calc = new Calculator(function (a = 0, operator = '+', b = 1) {
		switch (operator) {
			case "+": return a + b
			case "-": return a - b
			case "*": return a * b
			case "/": return a / b
		}
		return null
	});

	assert.equal(calc(3, "+"), 4, "default argument value");
	assert.equal(calc(41), 42, "default arguments values");
	assert.throws(function () {
		calc(6, "*", false);
	}, /TypeError/, "invalid argument type");

});

QUnit.test("other models & objects as arguments", function (assert) {

	const api = FunctionModel({
		list: ArrayModel(Number),
		op: ["sum", "product"]
	})(function (options) {
		return options.list.reduce(function (a, b) {
			switch (options.op) {
				case "sum":
					return a + b;
				case "product":
					return a * b;
			}
		}, options.op === "product" ? 1 : 0);
	});

	assert.equal(api({ list: [1, 2, 3, 4], op: "sum" }), 10, "FunctionModel object argument 1/5");
	assert.equal(api({ list: [1, 2, 3, 4], op: "product" }), 24, "FunctionModel object argument 2/5");
	assert.throws(function () {
		api({ list: [1, 2, "3", 4], op: "product" });
	}, /TypeError/, "FunctionModel object argument 3/5");
	assert.throws(function () {
		api({ list: [1, 2, 3, 4], op: "divide" });
	}, /TypeError/, "FunctionModel object argument 4/5");
	assert.throws(function () {
		api({ list: [1, 2, 3, 4] });
	}, /TypeError/, "FunctionModel object argument 5/5");

	assert.ok(FunctionModel() instanceof FunctionModel, "FunctionModel does not throw when receiving no arguments");

});

QUnit.test("default value", function (assert) {

	const yell = FunctionModel(String).return(String).defaultTo(s => s.toUpperCase());

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

QUnit.test("Automatic model casting", function (assert) {

	const N = ObjectModel({ x: Number, y: [Number] }).defaultTo({ x: 5, y: 7 });
	const F = FunctionModel(N, N).return(N);
	const f = F(function (a, b) { return { x: a.x + b.x, y: a.y + b.y } });
	const returnValue = f({ x: 1 }, { x: 2 });

	assert.ok(returnValue instanceof N, "test automatic model casting with return value");
	assert.equal(returnValue.x, 3, "test automatic casting with function args 1/2");
	assert.equal(returnValue.y, 14, "test automatic casting with function args 2/2");

})