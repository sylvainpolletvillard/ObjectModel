const {suite, test} = require('mocha');
const assert        = require('assert');

const {BasicModel} = require("../src/index.js");

suite("Basic Models");

test("Basic models constructor && proto are correctly defined", function () {
	assert(BasicModel instanceof Function, "BasicModel is defined");

	const NumberModel = BasicModel(Number);

	assert(typeof NumberModel.extend === "function", "test model method extend");
	assert(typeof NumberModel.assert === "function", "test model method assert");
	assert(typeof NumberModel.test === "function", "test model method test");
	assert(typeof NumberModel.validate === "function", "test model method validate");
	assert(NumberModel.definition === Number, "test model prop definition");
	assert(typeof NumberModel.assertions === "object", "test model prop assertions");

	const NumberModelThroughConstructor = new BasicModel(Number);

	assert(typeof NumberModelThroughConstructor.extend === "function", "test new model method extend");
	assert(typeof NumberModelThroughConstructor.assert === "function", "test new model method assert");
	assert(typeof NumberModelThroughConstructor.test === "function", "test new model method test");
	assert(typeof NumberModelThroughConstructor.validate === "function", "test new model method validate");
	assert(NumberModelThroughConstructor.definition === Number, "test new model prop definition");
	assert(typeof NumberModelThroughConstructor.assertions === "object", "test new model prop assertions");

});

test("Basic model behaviour", function () {
	const NumberModel = BasicModel(Number);
	NumberModel(0); // should not throw
	assert(typeof NumberModel(42) === "number", "should return the original type");
	assert(NumberModel(17) === 17, "should return the original value");
	assert.throws(function () {
		NumberModel("12")
	}, /TypeError/, "test invalid type");
	assert.throws(function () {
		NumberModel(NaN)
	}, /TypeError/, "test NaN is invalid");
})

test("Optional basic model behaviour", function () {

	const OptionalNumberModel = BasicModel([Number]);
	assert.throws(function () {
		NumberModel()
	}, /TypeError/, "test undefined value for optional model");
	OptionalNumberModel(); // should not throw

	const NumberModel                 = BasicModel(Number);
	const OptionalExtendedNumberModel = NumberModel.extend(undefined);
	OptionalExtendedNumberModel(); // should not throw
	assert.throws(function () {
		NumberModel()
	}, /TypeError/, "test undefined value on mandatory prop");

});

test("Union basic model", function () {
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

	assert(myModel.test("666") === true, "model.test 1/2");
	assert(myModel.test(666) === false, "model.test 2/2");

	myModel.validate("666"); // should not throw
	assert.throws(function () {
		myModel.validate(666)
	}, /TypeError/, "test undefined value");
});

test("Basic Model with undefined or no definition", function () {
	const UndefinedModel = BasicModel(undefined);
	assert(UndefinedModel instanceof BasicModel, "Model can receive undefined as argument");
	assert.throws(function () {
		BasicModel()
	}, /Error.*Model definition is required/, "Model without definition throws")
});