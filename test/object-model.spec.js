import {ObjectModel, BasicModel, ArrayModel} from "../src/index";
import consoleMock from "./mocks/console";

QUnit.module("Object Models");

QUnit.test("Object model constructor && proto", function (assert) {

	assert.ok(ObjectModel instanceof Function, "ObjectModel instanceof Function");

	const EmptyObjectModel = ObjectModel({});

	assert.ok(typeof EmptyObjectModel.extend === "function", "test object model method extend");
	assert.ok(typeof EmptyObjectModel.assert === "function", "test object model method assert");
	assert.ok(typeof EmptyObjectModel.test === "function", "test object model method test");
	assert.ok(typeof EmptyObjectModel.validate === "function", "test object model method validate");
	assert.ok(typeof EmptyObjectModel.definition === "object", "test object model prop definition");
	assert.ok(typeof EmptyObjectModel.assertions === "object", "test object model prop assertions");

	const EmptyObjectModelThroughConstructor = new ObjectModel({});

	assert.ok(typeof EmptyObjectModelThroughConstructor.extend === "function", "test new model method extend");
	assert.ok(typeof EmptyObjectModelThroughConstructor.assert === "function", "test new model method assert");
	assert.ok(typeof EmptyObjectModelThroughConstructor.test === "function", "test new model method test");
	assert.ok(typeof EmptyObjectModelThroughConstructor.validate === "function", "test new model method validate");
	assert.ok(typeof EmptyObjectModelThroughConstructor.definition === "object", "test new model prop definition");
	assert.ok(typeof EmptyObjectModelThroughConstructor.assertions === "object", "test new model prop assertions");
})

QUnit.test("Object model behaviour for properties", function (assert) {
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
		birth: new Date(1990, 3, 25),
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
	assert.equal(+joe.birth, +(new Date(1990, 3, 25)), "Date property retrieved");
	assert.strictEqual(joe.address.work.city, "Lille", "nested property retrieved");
	assert.ok(joe instanceof Person && joe instanceof Object, "instance is instanceof model and Object");
	assert.ok(Person instanceof ObjectModel && Person instanceof Function, "model is instanceof ObjectModel and Function");

	joe.name = "Big Joe";
	joe.age++;
	joe.birth = new Date(1990, 3, 26);
	delete joe.female;

	assert.throws(function () {
		joe.name = 42;
	}, /TypeError.*got Number 42/, "invalid Number set");
	assert.throws(function () {
		joe.age = true;
	}, /TypeError.*got Boolean true/, "invalid Boolean set");
	assert.throws(function () {
		joe.birth = function () {
		};
	}, /TypeError.*got Function/, "invalid Function set");
	assert.throws(function () {
		joe.female = "nope";
	}, /TypeError.*got String "nope"/, "invalid String set");
	assert.throws(function () {
		joe.address.work.city = [];
	}, /TypeError.*got Array/, "invalid Array set");
	assert.throws(function () {
		joe.address.work = {city: 42};
	}, /TypeError.*got Number 42/, "invalid Object set");
	assert.throws(function () {
			joe = Person({
				name: "Joe",
				age: 42,
				birth: new Date(1990, 3, 25),
				female: "false"
			});
		}, /TypeError.*expecting female to be Boolean.*got String "false"/,
		"invalid prop at object model instanciation"
	);

	joe = Person({
		name: "Joe",
		age: 42,
		birth: new Date(1990, 3, 25),
		female: false,
		address: {
			work: {
				city: "Lille"
			}
		},
		job: "Taxi"
	});

	assert.strictEqual(joe.job, "Taxi", "Properties out of model definition are kept but are not validated");

	assert.throws(function () {
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
	}, function (err) {
		return /TypeError/.test(err.toString())
			&& /name/.test(err.toString())
			&& /age/.test(err.toString())
			&& /birth/.test(err.toString())
			&& /city/.test(err.toString())
	}, "check that errors are correctly stacked");
});

QUnit.test("ObjectModel edge cases of constructors", function (assert) {
	assert.ok(ObjectModel({}) instanceof ObjectModel, "ObjectModel can receive empty object as argument");
	assert.throws(function () {
		ObjectModel()
	}, /Error.*Model definition is required/, "ObjectModel without definition throws")

	/* //TODO
	 assert.throws(function () {
	 ObjectModel(undefined)
	 }, /expecting arguments\[0] to be Object, got undefined/,
	 "ObjectModel with definition undefined throws")

	 assert.throws(function () {
	 ObjectModel(42)
	 }, /expecting arguments\[0] to be Object, got Number 42/,
	 "ObjectModel with definition primitive throws")
	 */
});

QUnit.test("ObjectModel with optional and multiple parameters", function (assert) {
	var Person = ObjectModel({
		name: [String],
		age: [Number, Date, String, Boolean, undefined],
		female: [Boolean, Number, String, null],
		haircolor: ["blond", "brown", "black", undefined],
		address: {
			work: {
				city: [String]
			}
		}
	});

	var joe = Person({female: false});
	assert.ok(joe instanceof Person, "instanceof model test");
	joe.name = "joe";
	joe.name = undefined;
	joe.name = null;
	joe.age  = new Date(1995, 1, 23);
	joe.age  = undefined;
	assert.throws(function () {
		joe.age = null;
	}, /TypeError.*got null/, "invalid set null");
	joe.female = "ann";
	joe.female = 2;
	joe.female = false;
	assert.throws(function () {
		joe.female = undefined;
	}, /TypeError.*got undefined/, "invalid set undefined");
	joe.address.work.city = "Lille";
	joe.address.work.city = undefined;
	joe.haircolor         = "blond";
	joe.haircolor         = undefined;
	assert.throws(function () {
		joe.name = false;
	}, /TypeError.*expecting name to be String.*got Boolean false/, "invalid type for optional prop");
	assert.throws(function () {
		joe.age = null;
	}, /TypeError.*expecting age to be Number or Date or String or Boolean or undefined/, "invalid set null for optional union type prop");
	assert.throws(function () {
		joe.age = [];
	}, /TypeError.*got Array/, "invalid set array for optional union type prop");
	assert.throws(function () {
		joe.address.work.city = 0;
	}, /TypeError.*expecting address.work.city to be String.*got Number 0/, "invalid type for nested optional prop");
	assert.throws(function () {
		joe.haircolor = "";
	}, /TypeError.*expecting haircolor to be "blond" or "brown" or "black" or undefined, got String ""/, "invalid type for value enum prop");

});

QUnit.test("ObjectModel with fixed values", function (assert) {
	var myModel = ObjectModel({
		a: [1, 2, 3],
		b: 42,
		c: ["", false, null, 0],
		haircolor: ["blond", "brown", "black"],
		foo: "bar",
		x: [Number, true]
	});

	var model = myModel({
		a: 1,
		b: 42,
		c: 0,
		haircolor: "blond",
		foo: "bar",
		x: true
	});

	model.x         = 666;
	model.haircolor = "brown";

	assert.throws(function () {
		model.a = 4;
	}, /TypeError.*expecting a to be 1 or 2 or 3.*got Number 4/, 'invalid set on values enum 1/2');
	assert.throws(function () {
		model.b = 43;
	}, /TypeError.*expecting b to be 42.*got Number 43/, "invalid set on fixed value 1/2");
	assert.throws(function () {
		model.c = undefined;
	}, /TypeError.*expecting c to be "" or false or null or 0.*got undefined/, "invalid set undefined on mixed typed values enum");
	assert.throws(function () {
		model.haircolor = "roux";
	}, /TypeError.*expecting haircolor to be "blond" or "brown" or "black".*got String "roux"/, 'invalid set on values enum 2/2');
	assert.throws(function () {
		model.foo = "baz";
	}, /TypeError.*expecting foo to be "bar".*got String "baz"/, "invalid set on fixed value 2/2");
	assert.throws(function () {
		model.x = false;
	}, /TypeError.*expecting x to be Number or true.*got Boolean false/, "invalid set on mixed type/values enum");

});

QUnit.test("Object model default values", function (assert) {

	const myModel = new ObjectModel({
		name: String,
		foo: {
			bar: {
				buz: Number
			}
		}
	}).defaults({
		name: "joe",
		foo: {
			bar: {
				buz: 0
			}
		}
	});

	const model = myModel();
	assert.strictEqual(model.name, "joe", "defaults values correctly applied");
	assert.strictEqual(model.foo.bar.buz, 0, "defaults nested props values correctly applied");
	assert.ok(myModel.test({}), "defaults should be applied when testing duck typed objects")

	const model2 = myModel({name: "jim", foo: {bar: {buz: 1}}});
	assert.strictEqual(model2.name, "jim", "defaults values not applied if provided");
	assert.strictEqual(model2.foo.bar.buz, 1, "defaults nested props values not applied if provided");

});

QUnit.test("Object model defaultTo with defaults", function (assert) {

	const myModel = new ObjectModel({x: Number, y: String})
		.defaultTo({x: 42})
		.defaults({y: "hello"})

	assert.strictEqual(myModel.default.x, 42, "object model defaultTo store the value as default property")
	assert.strictEqual(myModel.prototype.y, "hello", "object model defaults store values to proto")
	assert.strictEqual(myModel().x, 42, "object model default property is applied when undefined is passed");
	assert.strictEqual(myModel().y, "hello", "defaulted object model still inherit from model proto");
	assert.strictEqual(myModel.default.y, undefined, "object model default value itself does not inherit from from model proto");

	myModel.default.x = "nope";

	assert.throws(function () {
		myModel()
	}, /TypeError.*got String "nope"/, "invalid default property still throws TypeError for object models");

});

QUnit.test("RegExp values", function (assert) {

	const myModel = ObjectModel({
		phonenumber: /^[0-9]{10}$/,
		voyels: [/^[aeiouy]+$/]
	});

	const m = myModel({
		phonenumber: "0612345678"
	});

	m.voyels = "ouioui";

	assert.throws(function () {
		m.voyels = "nonnon"
	}, /TypeError/, "regex matching");
	assert.throws(function () {
		m.phonenumber = "123456789"
	}, /TypeError/, "regex matching 2");

});

QUnit.test("Non-enumerable and non-writable properties", function (assert) {

	const myModel = ObjectModel({
		CONST: Number,
		_private: Number,
		normal: Number
	});

	const m = myModel({
		CONST: 42,
		_private: 43,
		normal: 44
	});

	m.normal++;
	m._private++;

	assert.throws(function () {
		m.CONST++;
	}, /TypeError[\s\S]*constant/, "try to redefine constant");
	assert.equal(Object.keys(m).length, 2, "non enumerable key not counted by Object.keys");
	assert.equal(Object.keys(m).includes("_private"), false, "non enumerable key not found in Object.keys");
	assert.equal(Object.getOwnPropertyNames(m).length, 2, "non enumerable key not counted by Object.getOwnPropertyNames");
	assert.equal(Object.getOwnPropertyNames(m).includes("_private"), false, "non enumerable key not found in Object.getOwnPropertyNames");
	assert.equal("normal" in m, true, "enumerable key found with operator in")
	assert.equal("_private" in m, false, "non enumerable key not found with operator in")

});

QUnit.test("Non-enumerable and non-writable properties with overridden convention", function (assert) {

	const myModel = ObjectModel({
		private_prop: Number,
		constant_prop: Number,
		normal_prop: Number
	});

	myModel.conventionForConstant = s => s.indexOf("constant_") === 0;
	myModel.conventionForPrivate  = s => s.indexOf("private_") === 0;

	const m = myModel({
		private_prop: 42,
		constant_prop: 43,
		normal_prop: 44
	});

	assert.throws(function () {
		m.constant_prop++;
	}, /TypeError[\s\S]*constant/, "try to redefine constant with overridden convention");
	assert.equal(Object.keys(m).length, 2, "non enumerable key not counted by Object.keys with overridden convention");
	assert.equal(Object.keys(m).includes("private_prop"), false, "non enumerable key not found in Object.keys with overridden convention");
	assert.equal(Object.getOwnPropertyNames(m).length, 2, "non enumerable key not counted by Object.getOwnPropertyNames with overridden convention");
	assert.equal(Object.getOwnPropertyNames(m).includes("private_prop"), false, "non enumerable key not found in Object.getOwnPropertyNames with overridden convention");
	assert.equal("normal_prop" in m, true, "enumerable key found with operator in with overridden convention")
	assert.equal("private_prop" in m, false, "non enumerable key not found with operator in with overridden convention")

});

QUnit.test("Extensions", function (assert) {

	const Person = ObjectModel({
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

	const joe = Person({
		name: "Joe",
		age: 42,
		birth: new Date(1990, 3, 25),
		female: false,
		address: {
			work: {
				city: "Lille"
			}
		}
	});

	const Woman = Person.extend({female: true});

	assert.ok(Person(joe), "Person valid model for joe");

	assert.throws(function () {
		Woman(joe);
	}, /TypeError[\s\S]*female/, "Woman invalid model for joe");

	assert.throws(function () {
		Woman({
			name: "Joe",
			age: 42,
			birth: new Date(1990, 3, 25),
			female: false,
			address: {
				work: {
					city: "Lille"
				}
			}
		});
	}, /TypeError[\s\S]*female/, "cant be woman from joe parameters");

	assert.throws(function () {
		Woman(joe);
	}, /TypeError[\s\S]*female/, "cant be woman from Person joe");

	const ann = Woman({
		name: "Joe's wife",
		age: 42,
		birth: new Date(1990, 3, 25),
		female: true,
		address: {
			work: {
				city: "Lille"
			}
		}
	});

	const UnemployedWoman = Woman.extend({
		address: {
			work: {
				city: undefined
			}
		}
	});

	assert.ok(Woman(ann), "Woman valid model for ann");

	assert.ok(Woman.prototype.constructor === Woman, "extended model has a new constructor");
	assert.ok(ann.constructor === Woman, "extended model instance has the right constructor");

	assert.throws(function () {
		UnemployedWoman(ann);
	}, /TypeError[\s\S]*city/, "ann cant be UnemployedWoman;  model extension nested undefined property");


	const jane = UnemployedWoman({
		name: "Jane",
		age: 52,
		birth: new Date(1990, 3, 25),
		female: true
	});

	assert.ok(ann instanceof Person, "ann instanceof Person");
	assert.ok(ann instanceof Woman, "ann instanceof Woman");
	assert.ok(jane instanceof Person, "jane instanceof Person");
	assert.ok(jane instanceof Woman, "jane instanceof Woman");
	assert.ok(jane instanceof UnemployedWoman, "jane instanceof UnemployedWoman");
	assert.equal(joe instanceof Woman, false, "joe not instanceof Woman");
	assert.equal(joe instanceof UnemployedWoman, false, "joe not instanceof UnemployedWoman");
	assert.equal(ann instanceof UnemployedWoman, false, "ann not instanceof UnemployedWoman");

	let Vehicle = {speed: Number};
	let Car     = Object.create(Vehicle);
	let Ferrari = ObjectModel({expensive: true}).extend(Car);
	assert.ok("speed" in Ferrari.definition, "should retrieve definitions from parent prototypes when extending with objects");

	Vehicle = function () {};
	Vehicle.prototype.speed = 99;
	Car = function () {};
	Car.prototype = new Vehicle();
	Ferrari = ObjectModel({}).extend(Car);

	assert.ok("speed" in new Ferrari(), "should retrieve properties from parent prototypes when extending with constructors");

});

QUnit.test("Multiple inheritance", function (assert) {

	const A = new ObjectModel({
		a: Boolean,
		b: Boolean
	});

	const B = ObjectModel({
		b: Number,
		c: Number
	});

	const C = ObjectModel({
		c: String,
		d: {
			d1: Boolean,
			d2: Boolean
		}
	});

	const D = ObjectModel({
		a: String,
		d: {
			d2: Number,
			d3: Number
		}
	});

	let M1 = A.extend(B, C, D);
	let M2 = D.extend(C, B, A);

	assert.equal(Object.keys(M1.definition).sort().join(','), "a,b,c,d", "definition merge for multiple inheritance 1/4");
	assert.equal(Object.keys(M2.definition).sort().join(','), "a,b,c,d", "definition merge for multiple inheritance 2/4");
	assert.equal(Object.keys(M1.definition.d).sort().join(','), "d1,d2,d3", "definition merge for multiple inheritance 3/4");
	assert.equal(Object.keys(M2.definition.d).sort().join(','), "d1,d2,d3", "definition merge for multiple inheritance 4/4");

	let m1 = M1({
		a: "",
		b: 42,
		c: "test",
		d: {
			d1: true,
			d2: 2,
			d3: 3
		}
	});

	let m2 = M2({
		a: false,
		b: false,
		c: 666,
		d: {
			d1: false,
			d2: false,
			d3: 0
		}
	});

	assert.throws(function () {
		m1.a = true;
	}, /TypeError[\s\S]*a/, "type checking multiple inheritance 1/8");
	assert.throws(function () {
		m2.a = "nope";
	}, /TypeError[\s\S]*a/, "type checking multiple inheritance 2/8");
	assert.throws(function () {
		m1.b = !m1.b;
	}, /TypeError[\s\S]*b/, "type checking multiple inheritance 3/8");
	assert.throws(function () {
		m2.b += 7;
	}, /TypeError[\s\S]*b/, "type checking multiple inheritance 4/8");
	assert.throws(function () {
		m1.c = undefined;
	}, /TypeError[\s\S]*c/, "type checking multiple inheritance 5/8");
	assert.throws(function () {
		m2.c = null;
	}, /TypeError[\s\S]*c/, "type checking multiple inheritance 6/8");
	assert.throws(function () {
		m1.d.d2 = true;
	}, /TypeError[\s\S]*d2/, "type checking multiple inheritance 7/8");
	assert.throws(function () {
		m2.d.d2 = 1;
	}, /TypeError[\s\S]*d2/, "type checking multiple inheritance 8/8");

	A.defaults({
		a: false,
		b: false
	});

	B.defaults({
		b: 0,
		c: 0
	});

	C.defaults({
		c: "",
		d: {
			d1: false,
			d2: false
		}
	});

	D.defaults({
		a: "",
		d: {
			d2: 0,
			d3: 0
		}
	});

	M1 = A.extend(B, C, D);
	M2 = D.extend(C, B, A);
	m1 = M1();
	m2 = M2();

	assert.ok(m1.a === "" && m1.b === 0 && m1.c === "" && m1.d.d1 === false && m1.d.d2 === 0 && m1.d.d3 === 0, "defaults checking multiple inheritance 1/2");
	assert.ok(m2.a === false && m2.b === false && m2.c === 0 && m2.d.d1 === false && m2.d.d2 === false && m2.d.d3 === 0, "defaults checking multiple inheritance 2/2");

	function dummyAssert() {
		return true;
	}

	A.assert(dummyAssert);
	B.assert(dummyAssert);
	C.assert(dummyAssert);
	D.assert(dummyAssert);

	M1 = A.extend(B, C, D);
	M2 = D.extend(C, B, A);
	m1 = M1();
	m2 = M2();

	assert.ok(M1.assertions.length === 4, "assertions checking multiple inheritance 1/2");
	assert.ok(M2.assertions.length === 4, "assertions checking multiple inheritance 2/2");

});

QUnit.test("Composition", function (assert) {

	const Person = ObjectModel({
		name: String,
		age: [Number, Date],
		female: [Boolean],
		address: {
			work: {
				city: [String]
			}
		}
	});

	const Family = ObjectModel({
		father: Person,
		mother: Person.extend({female: true}),
		children: ArrayModel(Person),
		grandparents: [ArrayModel(Person).assert(function (persons) {
			return persons && persons.length <= 4
		})]
	});

	const joe = Person({
		name: "Joe",
		age: 42,
		female: false
	});


	const ann = new Person({
		female: true,
		age: joe.age - 5,
		name: joe.name + "'s wife"
	});

	let joefamily = new Family({
		father: joe,
		mother: ann,
		children: []
	});

	assert.ok(joefamily instanceof Family, "joefamily instance of Family");
	assert.ok(joefamily.father instanceof Person, "father instanceof Person");
	assert.ok(joefamily.mother instanceof Person, "mother instanceof Person");

	const duckmother = {
		female: true,
		age: joe.age - 5,
		name: joe.name + "'s wife"
	};

	joefamily = new Family({
		father: joe,
		mother: duckmother,
		children: []
	});

	assert.ok(Person.test(duckmother), "Duck typing for object properties 1/2");
	assert.notOk(duckmother instanceof Person, "Duck typing for object properties 2/2");

	joefamily.mother.name = "Daisy";
	assert.equal(joefamily.mother.name, "Daisy", "Duck typing submodel property can be modified");
	assert.throws(function () {
		joefamily.mother.female = "Quack !";
	}, /TypeError[\s\S]*female/, "validation of submodel duck typed at modification");

	assert.throws(function () {
		new Family({
			father: joe,
			mother: {
				female: false,
				age: joe.age - 5,
				name: joe.name + "'s wife"
			},
			children: []
		});
	}, /TypeError[\s\S]*female/, "validation of submodel duck typed at instanciation");

});

QUnit.test("Object model Assertions", function (assert) {

	const NestedModel = ObjectModel({foo: {bar: {baz: Boolean}}})
		.assert(o => o.foo.bar.baz === true);

	const nestedModel = NestedModel({foo: {bar: {baz: true}}});

	assert.throws(function () {
		nestedModel.foo.bar.baz = false;
	}, /TypeError/, "test assertion after nested property assignment");

	function assertFail() {
		return false;
	}

	function assertFailWithData() {
		return -1;
	}

	BasicModel.prototype.assert(assertFail, "expected message without data");
	ObjectModel.prototype.assert(assertFailWithData, function (data) {
		return "expected message with data " + data;
	});

	assert.equal(BasicModel.prototype.assertions.length, 1, "check number of assertions on BasicModel.prototype")
	assert.equal(ObjectModel.prototype.assertions.length, 2, "check number of assertions on ObjectModel.prototype");

	const M = ObjectModel({a: String});

	assert.throws(function () {
		M({a: "test"})
	}, /TypeError/, "expected message without data");

	assert.throws(function () {
		M({a: "test"})
	}, /TypeError/, "expected message with data -1");

	// clean up global assertions
	BasicModel.prototype.assertions = [];
	delete ObjectModel.prototype.assertions;

	const AssertObject = ObjectModel({name: [String]})
		.assert((o => o.name.toLowerCase().length == o.name.length), "may throw exception");

	new AssertObject({name: "joe"});

	assert.throws(function () {
			new AssertObject({name: undefined});
		},
		/assertion \"may throw exception\" returned TypeError.*for value {\s+name: undefined\s+}/,
		"assertions catch exceptions on Object models");

});

QUnit.test("Object models validate method", function (assert) {

	const assertFunction = (c => c === "GB");

	assertFunction.toString = function () {
		return "expected assertFunction toString";
	}

	const Address = new ObjectModel({
		city: String,
		country: BasicModel(String).assert(assertFunction, "Country must be GB")
	});

	const gbAddress = {city: "London", country: "GB"};
	const frAddress = {city: "Paris", country: "FR"};

	const Order = new ObjectModel({
		sku: String,
		address: Address
	});

	const gbOrder = {sku: "ABC123", address: gbAddress};
	const frOrder = {sku: "ABC123", address: frAddress};

	Order.validate(gbOrder); // no errors
	assert.throws(function () {
		Order.validate(frOrder);
	}, "should validate sub-objects assertions");

	const errors = [];
	Order.validate(frOrder, function (err) {
		errors.push(...err);
	});

	assert.equal(errors.length, 1, "should throw exactly one error here")
	assert.equal(errors[0].expected, "expected assertFunction toString", "check assertion error expected parameter");
	assert.equal(errors[0].received, "FR", "check assertion error received parameter");
	assert.equal(errors[0].path, "address.country", "check assertion error path parameter");
	assert.equal(errors[0].message, 'assertion "Country must be GB" returned false for value "FR"', "check assertion error message parameter");

});

QUnit.test("Cyclic detection", function(assert){

	let A, B, a, b;

	A = ObjectModel({ b: [] });
	B = ObjectModel({ a: A });
	A.definition.b = [B];

	a = A();
	b = B({ a: a });

	assert.ok(a.b = b, "valid cyclic value assignment");
	assert.throws(function(){a.b = a; }, /TypeError/, "invalid cyclic value assignment");

	A = ObjectModel({ b: [] });
	B = ObjectModel({ a: A });

	A.definition.b = {
		c: {
			d: [B]
		}
	};

	a = A();
	b = B({ a: a });

	assert.ok((a.b = { c: { d: b } }), "valid deep cyclic value assignment");
	assert.throws(function(){
		a.b = { c: { d: a } };
	}, /TypeError/, "invalid deep cyclic value assignment");

	const Honey = ObjectModel({
		sweetie: [] // Sweetie is not yet defined
	});

	const Sweetie = ObjectModel({
		honey: Honey
	});

	Honey.definition.sweetie = [Sweetie];

	const joe = Honey({ sweetie: undefined }); // ann is not yet defined
	const ann = Sweetie({ honey: joe });
	assert.ok(joe.sweetie = ann, "website example valid assignment");
	assert.throws(function(){ joe.sweetie = "dog" }, /TypeError/, "website example invalid assignment 1");
	assert.throws(function(){ joe.sweetie = joe }, /TypeError/, "website example invalid assignment 2");

});

QUnit.test("Custom error collectors for object models", function (assert) {

	assert.expect(11);

	let M = ObjectModel({
		a: {
			b: {
				c: true
			}
		}
	});

	M.errorCollector = function (errors) {
		assert.ok(errors.length === 1, "check errors.length model collector");
		var err = errors[0];
		assert.equal(err.expected, true, "check error.expected model collector");
		assert.equal(err.received, false, "check error.received model collector");
		assert.equal(err.path, "a.b.c", "check error.path model collector");
		assert.equal(err.message, 'expecting a.b.c to be true, got Boolean false', "check error message model collector");
	}

	M({
		a: {
			b: {
				c: false
			}
		}
	})

	ObjectModel({
		d: {
			e: {
				f: null
			}
		}
	}).validate({
		d: {
			e: {
				f: undefined
			}
		}
	}, function (errors) {
		assert.ok(errors.length === 1, "check nested errors.length custom collector");
		var err = errors[0];
		assert.deepEqual(err.expected, null, "check nested error.expected custom collector");
		assert.deepEqual(err.received, undefined, "check nested error.received custom collector");
		assert.equal(err.path, "d.e.f", "check nested error.path custom collector");
		assert.equal(err.message, 'expecting d.e.f to be null, got undefined', "check nested error.message custom collector");
	})

	M = ObjectModel({x: Number});
	M.errorCollector = function noop() {};

	assert.equal(M.test({x: "nope"}), false, "model.test should work even when errorCollector does not throw exceptions");

});

QUnit.test("Automatic model casting", function (assert) {

	let User = new ObjectModel({username: String, email: String})
		.defaults({username: 'foo', email: 'foo@foo'});

	let Article = new ObjectModel({title: String, user: User})
		.defaults({title: 'bar', user: new User()});

	let a = new Article();
	a.user = {username: 'joe', email: 'foo'};

	assert.ok(a.user instanceof User, "automatic model casting when assigning a duck typed object");
	assert.ok(a.user.username === "joe", "preserved props after automatic model casting of duck typed object");

	User = new ObjectModel({username: String, email: String})
		.defaults({username: 'foo', email: 'foo@foo'});

	Article = new ObjectModel({title: String, user: [User]})
		.defaults({title: 'bar', user: new User()});

	a = new Article();
	a.user = {username: 'joe', email: 'foo'};

	assert.ok(a.user instanceof User, "automatic optional model casting when assigning a duck typed object");
	assert.ok(a.user.username === "joe", "preserved props after automatic optional model casting of duck typed object");


	const Type1 = ObjectModel({ name: String, other1: [Boolean] });
	const Type2 = ObjectModel({ name: String, other2: [Number] });
	const Container = ObjectModel({ foo: { bar: [Type1, Type2] }});

	consoleMock.apply();
	let c = new Container({ foo: { bar: { name: "dunno" }}});
	assert.ok(/Ambiguous model for[\s\S]*?name: "dunno"[\s\S]*?other1: \[Boolean\][\s\S]*?other2: \[Number]/
			.test(consoleMock["warnLastArgs"][0]),
		"should warn about ambiguous model for object sub prop"
	);
	assert.ok(c.foo.bar.name === "dunno", "should preserve values even when ambiguous model cast");
	assert.ok(!(c.foo.bar instanceof Type1 || c.foo.bar instanceof Type2), "should not cast when ambiguous model");
	consoleMock.revert();

	consoleMock.apply();
	c = new Container({ foo: { bar: Type2({ name: "dunno" }) }});
	assert.ok(consoleMock["warnLastArgs"].length === 0, "should not warn when explicit model cast in ambiguous context");
	assert.ok(c.foo.bar.name === "dunno", "should preserve values when explicit model cast in ambiguous context");
	assert.ok(c.foo.bar instanceof Type2, "should preserve model when explicit cast in ambiguous context");
	consoleMock.revert();

})