/* global QUnit, RefModel */

QUnit.module("Ref Models");

QUnit.test("constructor && proto", async function (assert) {
	assert.ok(RefModel instanceof Function, "RefModel instanceof Function");

	const RefModel = RefModel('key');
	assert.ok(typeof EmptyObjectModel.definition === "symbol", "test object model prop definition");

	const RefModelThroughConstructor = new RefModel('key');
	assert.ok(typeof RefModelThroughConstructor.definition === "symbol", "test new model prop definition");
})