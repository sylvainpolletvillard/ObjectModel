/* global QUnit, Any, Model, BasicModel, FunctionModel */

QUnit.module("Any Model");

QUnit.test("any model validation", function (assert) {
	assert.ok(Any instanceof Model, "Any is instance of Model")
	assert.ok(Any instanceof BasicModel, "Any is instance of BasicModel")
	assert.ok(Any.test(undefined), "testing undefined")
	assert.ok(Any.test(null), "testing null")
	assert.ok(Any.test(0), "testing 0")
	assert.ok(Any.test(1), "testing 1")
	assert.ok(Any.test(""), "testing empty string")
	assert.ok(Any.test("test"), "testing string")
	assert.ok(Any.test(false), "testing false")
	assert.ok(Any.test(true), "testing true")
	assert.ok(Any.test({}), "testing object")
	assert.ok(Any.test([]), "testing array")
	assert.ok(Any.test(function () { }), "testing function")
	assert.ok(Any.test(Symbol()), "testing symbol")
})

QUnit.test("any as objectmodel property", function (assert) {
	let M = Model({ x: Any })
	assert.ok(M({}) instanceof M, "testing no prop")
	assert.ok(M({ x: undefined }).x === undefined, "testing undefined prop")
	assert.ok(M({ x: null }).x === null, "testing null prop")
	assert.ok(M({ x: 0 }).x === 0, "testing 0 prop")
	assert.ok(M({ x: 1 }).x === 1, "testing 1 prop")
	assert.ok(M({ x: false }).x === false, "testing false prop")
	assert.ok(M({ x: "" }).x === "", "testing empty string prop")
})

QUnit.test("any for remaining function models arguments", function (assert) {
	let Operation = FunctionModel(...Any).return(Number)
	let add = Operation((...args) => args.reduce((total, n) => total + n, 0))
	assert.strictEqual(add(), 0, "testing 0 args")
	assert.strictEqual(add(1), 1, "testing 1 arg")
	assert.strictEqual(add(1, 2), 3, "testing 2 args")
	assert.strictEqual(add(1, 2, 3, 4, 5), 15, "testing N args")

	let TwoArgsOrMore = FunctionModel(Number, Number, ...Any)
	add = TwoArgsOrMore((...args) => args.reduce((total, n) => total + n, 0))
	assert.throws(() => { add() }, /TypeError.*arguments\[0]/, 1, "testing 0 args with 2 required")
	assert.throws(() => { add(1) }, /TypeError.*arguments\[1]/, 1, "testing 1 arg with 2 required")
	assert.strictEqual(add(1, 2), 3, "testing 2 args with 2 required")
	assert.strictEqual(add(1, 2, 3, 4, 5), 15, "testing N args with 2 required")
})

QUnit.test("any for typed remaining function models arguments", function (assert) {
	let Operation = FunctionModel(...Any(Number)).return(Number)
	let add = Operation((...args) => args.reduce((total, n) => total + n, 0))
	assert.strictEqual(add(), 0, "testing 0 args")
	assert.strictEqual(add(1), 1, "testing 1 arg")
	assert.strictEqual(add(1, 2), 3, "testing 2 args")
	assert.strictEqual(add(1, 2, 3, 4, 5), 15, "testing N args")
	assert.throws(() => { add(1, 2, 3, "4") }, /TypeError.*arguments\[3]/, "testing invalid typed remaining arg")
})

QUnit.test("any model formatter", function (assert) {
	assert.strictEqual(Any.toString(), "Any", "Any toString")
	let Operation = FunctionModel(...Any).return(Number)
	assert.strictEqual(Operation.toString(), "Function(...Any) => Number", "Any remaining toString")

	let TwoArgsOrMore = FunctionModel(Number, Number, ...Any)
	assert.strictEqual(TwoArgsOrMore.toString(), "Function(Number, Number, ...Any)", "Any remaining with other args toString")

	Operation = FunctionModel(...Any(Number)).return(Number)
	assert.strictEqual(Operation.toString(), "Function(...Number) => Number", "Any remaining with definition toString")
})