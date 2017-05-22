import {Model, BasicModel, ObjectModel} from "../src/index";

QUnit.module("Generic Model");

QUnit.test("Generic models constructor && proto are correctly defined", function (assert) {
	assert.ok(Model instanceof Function, "Model is defined");

	assert.ok(Model(Number) instanceof BasicModel, "test model constructor 1/4");
	assert.ok(Model({}) instanceof ObjectModel, "test model constructor 2/4");
	assert.ok(Model([]) instanceof BasicModel, "test model constructor 3/4");
	assert.ok(Model() instanceof BasicModel, "test model constructor 4/4");
});