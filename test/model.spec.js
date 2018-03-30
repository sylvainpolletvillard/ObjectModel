/* global QUnit Model BasicModel ObjectModel */

QUnit.module("Generic Model");

QUnit.test("Generic models constructor && proto", function (assert) {
	assert.ok(Model instanceof Function, "Model is defined");

	assert.ok(Model(Number) instanceof BasicModel, "test model constructor 1/4");
	assert.ok(Model({}) instanceof ObjectModel, "test model constructor 2/4");
	assert.ok(Model([]) instanceof BasicModel, "test model constructor 3/4");
	assert.ok(Model() instanceof BasicModel, "test model constructor 4/4");
});

QUnit.test("Model.Name", function(assert) {
	assert.equal(typeof Model.Name, "symbol", "test Model.Name 1/2");
	let NamedModel = Model({ [Model.Name]: "Test" });
	let namedInstance = NamedModel({});
	assert.equal(namedInstance[Model.Name], "Test", "test Model.Name 2/2");
})