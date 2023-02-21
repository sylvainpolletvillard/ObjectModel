/* global QUnit, BasicModel */

QUnit.module("Basic Models");

QUnit.test("constructor && proto are correctly defined", function (assert) {
	assert.ok(BasicModel instanceof Function, "BasicModel is defined");

	const NumberModel = BasicModel(Number);

	assert.ok(typeof NumberModel.extend === "function", "test model method extend");
	assert.ok(typeof NumberModel.assert === "function", "test model method assert");
	assert.ok(typeof NumberModel.test === "function", "test model method test");
	assert.ok(NumberModel.definition === Number, "test model prop definition");
	assert.ok(typeof NumberModel.assertions === "object", "test model prop assertions");

	const NumberModelThroughConstructor = new BasicModel(Number);

	assert.ok(typeof NumberModelThroughConstructor.extend === "function", "test new model method extend");
	assert.ok(typeof NumberModelThroughConstructor.assert === "function", "test new model method assert");
	assert.ok(typeof NumberModelThroughConstructor.test === "function", "test new model method test");
	assert.ok(NumberModelThroughConstructor.definition === Number, "test new model prop definition");
	assert.ok(typeof NumberModelThroughConstructor.assertions === "object", "test new model prop assertions");
});

QUnit.test("undefined definition", function (assert) {
	const UndefinedModel = BasicModel(undefined);
	assert.ok(UndefinedModel instanceof BasicModel, "Model can receive undefined as argument");
});

QUnit.test("basic type behaviour", function (assert) {

	const NumberModel = BasicModel(Number);
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

QUnit.test("Optional type", function (assert) {

	const NumberModel = BasicModel(Number);
	const OptionalNumberModel = BasicModel([Number]);

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

QUnit.test("Union type", function (assert) {

	const myModel = BasicModel([String, Boolean, Date]);
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

});

QUnit.test("default values", function (assert) {

	const myModel = BasicModel([String, Boolean, Date]);
	myModel.defaultTo("blob");
	assert.strictEqual(myModel.default, "blob", "basic model default store the value as default property")
	assert.strictEqual(myModel(), "blob", "basic model default property is applied when undefined is passed");
	myModel.default = 42;
	assert.throws(function () {
		myModel()
	}, /TypeError.*got Number 42/, "basic model invalid default property still throws TypeError");

});

QUnit.test("validate defaut values provided", function (assert) {
	assert.throws(function () {
		BasicModel(Number).defaultTo()
	}, /TypeError.*expecting Number, got undefined*/, "invalid default value provided: undefined");
	assert.throws(function () {
		BasicModel(String).defaultTo(666)
	}, /TypeError.*expecting String, got Number 666*/, "invalid default value provided: wrong type");
})

QUnit.test("Assertions", function (assert) {

	function isOdd(n) {
		return n % 2 === 1;
	}

	const OddNumber = BasicModel(Number).assert(isOdd);
	assert.strictEqual(OddNumber(17), 17, "passing assertion on basic model 1/2");
	assert.throws(function () {
		OddNumber(18)
	}, /TypeError[\s\S]*isOdd/, "failing assertion on basic model 1/2");

	const RealNumber = BasicModel(Number).assert(isFinite);

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

	const AssertBasic = BasicModel(Number).assert(function (v) {
		return +v.toString() === v
	}, "may throw exception")

	new AssertBasic(0);

	assert.throws(
		function () {
			new AssertBasic();
		},
		/assertion "may throw exception" returned TypeError.*for value undefined/,
		"assertions catch exceptions on Basic models"
	);

	assert.equal(PrimeNumber.toString(), "Number(isFinite,isInteger,isPrime)", "test assertions format for named functions")
	PrimeNumber.as("PrimeNumber");
	assert.equal(PrimeNumber.toString(), "PrimeNumber", "test named model format with assertions")

	assert.equal(AssertBasic.toString(), "Number(may throw exception)", "test format anonymous assertions with descriptions")
	const NonNullNumber = BasicModel(Number).assert(n => !!n)
	assert.equal(NonNullNumber.toString(), "Number(n => !!n)", "test format anonymous assertions without descriptions")

});

QUnit.test("Custom error collectors", function (assert) {

	assert.expect(13);

	const defaultErrorCollector = BasicModel.prototype.errorCollector;
	assert.equal(typeof defaultErrorCollector, "function", "BasicModel has default errorCollector");

	BasicModel.prototype.errorCollector = function (errors) {
		assert.ok(errors.length === 1, "check errors.length global collector");
		const err = errors[0];
		assert.equal(err.expected, Number, "check error.expected global collector");
		assert.equal(err.received, "nope", "check error.received global collector");
		assert.equal(err.message, 'expecting Number, got String "nope"', "check error.message global collector");
	}

	BasicModel(Number)("nope");

	BasicModel.prototype.errorCollector = function (errors) {
		assert.ok(errors.length === 1, 'global custom collector assertion error catch 1/2');
		assert.equal(errors[0].message,
			'assertion "shouldnt be nope" returned false for value "nope"',
			'global custom collector assertion error catch 2/2');
	}

	BasicModel(String).assert(function (s) {
		return s !== "nope"
	}, "shouldnt be nope")("nope");

	BasicModel(Number).test("nope", function (errors) {
		assert.ok(errors.length === 1, "check errors.length custom collector");
		var err = errors[0];
		assert.equal(err.expected, Number, "check error.expected custom collector");
		assert.equal(err.received, "nope", "check error.received custom collector");
		assert.equal(err.message, 'expecting Number, got String "nope"', "check error.message custom collector");
	});

	BasicModel(String).assert(function (s) { return s !== "nope" }, "shouldnt be nope")
		.test("nope", function (errors) {
			assert.ok(errors.length === 1, 'local custom collector assertion error catch 1/2');
			assert.equal(errors[0].message,
				'assertion "shouldnt be nope" returned false for value "nope"',
				'local custom collector assertion error catch 2/2');
		});

	BasicModel.prototype.errorCollector = defaultErrorCollector;

});

QUnit.test("Extensions", function (assert) {

	const PositiveInteger = BasicModel(Number)
		.assert(Number.isInteger)
		.assert(n => n >= 0, "should be greater or equal to zero")

	function isPrime(n) {
		for (var i = 2, m = Math.sqrt(n); i <= m; i++) {
			if (n % i === 0) return false;
		}
		return n > 1;
	}

	const PrimeNumber = PositiveInteger.extend().assert(isPrime);

	assert.equal(PrimeNumber.definition, Number, "Extension retrieve original definition");
	assert.equal(PrimeNumber.assertions.length, 3, "Extension can add assertions");
	assert.equal(PositiveInteger.assertions.length, 2, "Extension assertions are not added to original model");

})

QUnit.test("Object definitions behaviour", function (assert) {
	const foo = BasicModel({ foo: String })
	assert.equal(typeof foo.definition, "object", "Object definition can be passed to BasicModel")
	assert.equal(foo({ foo: "bar" }).foo, "bar", "BasicModel with object definition is valid")
	assert.throws(
		function () {
			foo({ foo: 123 })
		},
		/TypeError.*expecting foo to be String, got Number 123/,
		"BasicModel with object definition has invalid prop value"
	);
	assert.throws(
		function () {
			foo("bar")
		},
		/TypeError.*expecting foo to be String, got undefined/,
		"BasicModel with object definition has invalid type"
	);
	assert.throws(
		function () {
			BasicModel({ foo: String })("bar")
		},
		/TypeError.*expecting foo to be String, got undefined/,
		"BasicModel with object definition has invalid type"
	);
	assert.throws(
		function () {
			foo(123)
		},
		/TypeError.*expecting foo to be String, got undefined/,
		"BasicModel with object definition has invalid type"
	);
})