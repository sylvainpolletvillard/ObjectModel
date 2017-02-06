const {suite, test} = require('mocha');
const assert        = require('assert');

const {ObjectModel} = require("../src/index.js");

suite("Object Models");

test( "Object model constructor && proto", function() {

	assert.throws(function () {
		ObjectModel()
	}, /Error.*Model definition is required/,
		"ObjectModel without definition throws")

	assert.throws(function () {
			ObjectModel(undefined)
		}, /Error.*expected definition to be Object, got undefined/,
		"ObjectModel with definition undefined throws")

	assert.throws(function () {
			ObjectModel(42)
		}, /Error.*expected definition to be Object, got 42/,
		"ObjectModel with definition primitive throws")

	const EmptyObjectModel = ObjectModel({});

	assert(typeof EmptyObjectModel.extend === "function", "test object model method extend");
	assert(typeof EmptyObjectModel.assert === "function", "test object model method assert");
	assert(typeof EmptyObjectModel.test === "function", "test object model method test");
	assert(typeof EmptyObjectModel.validate === "function", "test object model method validate");
	assert(EmptyObjectModel.definition === Number, "test object model prop definition");
	assert(typeof EmptyObjectModel.assertions === "object", "test object model prop assertions");

	const EmptyObjectModelThroughConstructor = new ObjectModel({});

	assert(typeof EmptyObjectModelThroughConstructor.extend === "function", "test new model method extend");
	assert(typeof EmptyObjectModelThroughConstructor.assert === "function", "test new model method assert");
	assert(typeof EmptyObjectModelThroughConstructor.test === "function", "test new model method test");
	assert(typeof EmptyObjectModelThroughConstructor.validate === "function", "test new model method validate");
	assert(EmptyObjectModelThroughConstructor.definition === Number, "test new model prop definition");
	assert(typeof EmptyObjectModelThroughConstructor.assertions === "object", "test new model prop assertions");
})

test("Object model behaviour for properties", function(){
	//TODO
})

	assert(ObjectModel instanceof Function, "ObjectModel instanceof Function");

	var Person = ObjectModel({
		name: String,
		age: Number,
		birth: Date,
		female: [Boolean],
		address: {
			work: {
				city: [String]
			}
		}
	});

	var joe = Person({
		name: "Joe",
		age: 42,
		birth: new Date(1990,3,25),
		female: false,
		address: {
			work: {
				city: "Lille"
			}
		}
	});

	assert.strictEqual(joe.name, "Joe", "String property retrieved");
	assert.strictEqual(joe.age, 42, "Number property retrieved");
	assert.strictEqual(joe.female, false, "Boolean property retrieved");
	assert.equal(+joe.birth, +(new Date(1990,3,25)), "Date property retrieved");
	assert.strictEqual(joe.address.work.city, "Lille", "nested property retrieved");
	assert.ok(joe instanceof Person && joe instanceof Object, "instance is instanceof model and Object");
	assert.ok(Person instanceof ObjectModel && Person instanceof Function, "model is instanceof ObjectModel and Function");

	joe.name = "Big Joe";
	joe.age++;
	joe.birth = new Date(1990,3,26);
	delete joe.female;

	assert.throws(function(){ joe.name = 42; }, /TypeError.*got Number 42/, "invalid Number set");
	assert.throws(function(){ joe.age = true; }, /TypeError.*got Boolean true/, "invalid Boolean set");
	assert.throws(function(){ joe.birth = function(){}; }, /TypeError.*got Function/, "invalid Function set");
	assert.throws(function(){ joe.female = "nope"; }, /TypeError.*got String "nope"/, "invalid String set");
	assert.throws(function(){ joe.address.work.city = []; }, /TypeError.*got Array/,"invalid Array set");
	assert.throws(function(){ joe.address.work = { city: 42 }; }, /TypeError.*got Number 42/,"invalid Object set");
	assert.throws(function(){
			joe = Person({
				name: "Joe",
				age: 42,
				birth: new Date(1990,3,25),
				female: "false"
			});
		}, /TypeError.*expecting female to be Boolean.*got String "false"/,
		"invalid prop at object model instanciation"
	);

	joe = Person({
		name: "Joe",
		age: 42,
		birth: new Date(1990,3,25),
		female: false,
		address: {
			work: {
				city: "Lille"
			}
		},
		job: "Taxi"
	});

	assert.strictEqual(joe.job, "Taxi", "Properties out of model definition are kept but are not validated");

	assert.throws(function() {
		Person({
			name: false,
			age: [42],
			birth: "nope",
			female: null,
			address: {
				work: {
					city: true
				}
			}
		});
	}, function(err){
		return /TypeError/.test(err.toString())
			&& /name/.test(err.toString())
			&& /age/.test(err.toString())
			&& /birth/.test(err.toString())
			&& /city/.test(err.toString())
	}, "check that errors are correctly stacked");

	assert.ok(ObjectModel({}) instanceof ObjectModel, "ObjectModel can receive empty object as argument");
	assert.throws(function(){ ObjectModel() }, /Error.*Model definition is required/, "ObjectModel without definition throws")
});
