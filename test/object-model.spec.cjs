/* global QUnit, Model, BasicModel, ArrayModel, ObjectModel */
QUnit.module("Object Models");

const consoleMock = (function (console) {
	const methods = ["debug", "log", "warn", "error"];
	const originals = {};
	const mocks = {}
	const lastArgs = {};

	methods.forEach(method => {
		originals[method] = console[method]
		mocks[method] = function () { lastArgs[method] = arguments }
	})

	return {
		apply: function () {
			methods.forEach(method => {
				lastArgs[method] = [];
				console[method] = mocks[method]
			})
		},
		revert: function () {
			methods.forEach(method => {
				lastArgs[method] = [];
				console[method] = originals[method]
			})
		},
		lastArgs
	}
})(console);

QUnit.test("constructor && proto", async function (assert) {
	assert.ok(ObjectModel instanceof Function, "ObjectModel instanceof Function");

	const EmptyObjectModel = ObjectModel({});

	assert.ok(typeof EmptyObjectModel.extend === "function", "test object model method extend");
	assert.ok(typeof EmptyObjectModel.assert === "function", "test object model method assert");
	assert.ok(typeof EmptyObjectModel.test === "function", "test object model method test");
	assert.ok(typeof EmptyObjectModel.definition === "object", "test object model prop definition");
	assert.ok(typeof EmptyObjectModel.assertions === "object", "test object model prop assertions");

	const EmptyObjectModelThroughConstructor = new ObjectModel({});

	assert.ok(typeof EmptyObjectModelThroughConstructor.extend === "function", "test new model method extend");
	assert.ok(typeof EmptyObjectModelThroughConstructor.assert === "function", "test new model method assert");
	assert.ok(typeof EmptyObjectModelThroughConstructor.test === "function", "test new model method test");
	assert.ok(typeof EmptyObjectModelThroughConstructor.definition === "object", "test new model prop definition");
	assert.ok(typeof EmptyObjectModelThroughConstructor.assertions === "object", "test new model prop assertions");
})

QUnit.test("behaviour for properties", function (assert) {
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
	assert.ok(Person instanceof ObjectModel, "model is instanceof ObjectModel");

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
		joe.address.work = { city: 42 };
	}, /TypeError.*got Number 42/, "invalid Object set");
	assert.throws(function () {
		Person({
			name: "Joe",
			age: 42,
			birth: new Date(1990, 3, 25),
			female: "false"
		});
	}, /TypeError.*expecting female to be Boolean.*got String "false"/,
	"invalid prop at object model instanciation");

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

	const A = ObjectModel({
		id: [Number]
	}).defaultTo({
		setId(id) { this.id = id; }
	})

	let a = new A({})
	assert.throws(() => { a.setId("32") }, /TypeError/, "methods should trigger type-checking");

});

QUnit.test("edge cases of constructors", function (assert) {
	assert.ok(ObjectModel({}) instanceof ObjectModel, "ObjectModel can receive empty object as argument");

	const M = ObjectModel({})
	assert.strictEqual(M.test(undefined), true, "undefined is valid for empty objectmodels, due to null-safe object traversal")
	assert.strictEqual(M.test(null), false, "null is invalid for empty objectmodels")
	assert.strictEqual(M.test(1), false, "number is invalid for empty objectmodels")
	assert.strictEqual(M.test(new Number(1)), true, "Numbers through constructor are valid for empty objectmodels")
	assert.strictEqual(M.test("string"), false, "string is invalid for empty objectmodels")
	assert.strictEqual(M.test(function () { }), true, "function is valid for empty objectmodels")

	const O = ObjectModel({ x: [Number] })
	assert.strictEqual(O.test(undefined), true, "undefined is valid for optional objectmodels, due to null-safe object traversal")
	assert.strictEqual(O.test(null), false, "null is invalid for optional objectmodels")
	assert.strictEqual(O.test(1), false, "number is invalid for optional objectmodels")
	assert.strictEqual(O.test(new Number(1)), true, "Numbers through constructor are valid for optional objectmodels")
	assert.strictEqual(O.test("string"), false, "string is invalid for optional objectmodels")
	assert.strictEqual(O.test(function () { }), true, "function is valid for optional objectmodels")


	/* //TODO: use FunctionModel for ObjectModel API ?
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

QUnit.test("optional and multiple parameters", function (assert) {
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

	var joe = Person({ female: false });
	assert.ok(joe instanceof Person, "instanceof model test");
	joe.name = "joe";
	joe.name = undefined;
	joe.name = null;
	joe.age = new Date(1995, 1, 23);
	joe.age = undefined;
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
	joe.haircolor = "blond";
	joe.haircolor = undefined;
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

QUnit.test("fixed values", function (assert) {
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

	model.x = 666;
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

QUnit.test("default values", function (assert) {

	let myModel = new ObjectModel({
		name: String,
		foo: {
			bar: {
				buz: Number
			}
		}
	}).defaultTo({
		name: "joe",
		foo: {
			bar: {
				buz: 0
			}
		}
	});

	const model = myModel();
	assert.strictEqual(model.name, "joe", "default values correctly applied");
	assert.strictEqual(model.foo.bar.buz, 0, "default nested props values correctly applied");
	assert.ok(myModel.test({}), "default should be applied when testing autocasted objects")

	const model2 = myModel({ name: "jim", foo: { bar: { buz: 1 } } });
	assert.strictEqual(model2.name, "jim", "default values not applied if provided");
	assert.strictEqual(model2.foo.bar.buz, 1, "default nested props values not applied if provided");

	const Person = Model({
		name: String,
		age: [Number]
	}).defaultTo({
		name: "new-name"
	});

	const Team = Model({
		lead: Person,
		members: ArrayModel(Person)
	});

	assert.strictEqual((new Team({ lead: new Person(), members: [] })).lead.name, "new-name", "default value through composition")
	assert.throws(() => { new Team({ lead: 1, members: [] }) }, "invalid value through composition with default")

	assert.throws(() => { myModel.defaultTo({ name: undefined }) }, /TypeError.*expecting name to be String, got undefined/, "check definition of provided defaults")
	assert.throws(() => { myModel.defaultTo({ foo: { bar: { buz: "nope" } } }) }, /TypeError.*expecting foo.bar.buz to be Number, got String/, "check nested definition of provided defaults")

	myModel = new ObjectModel({ x: Number, y: String })
		.defaultTo({ x: 42, y: "hello" })

	assert.strictEqual(myModel.default.x, 42, "object model defaults store the value as default property")
	assert.strictEqual(myModel().x, 42, "object model default property is applied when undefined is passed");
	assert.strictEqual(myModel().y, "hello", "defaulted object model still inherit from model proto");

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

QUnit.test("Private and constant properties", function (assert) {

	let myModel = ObjectModel({
		CONST: Number,
		_private: Number,
		normal: Number
	});

	let m = myModel({
		CONST: 42,
		_private: 43,
		normal: 44
	});

	m.normal++;

	assert.throws(function () {
		m._private++;
	}, /TypeError[\s\S]*private/, "try to modify private");

	assert.throws(function () {
		m.CONST++;
	}, /TypeError[\s\S]*constant/, "try to modify constant");
	assert.equal(Object.keys(m).length, 2, "non enumerable key not counted by Object.keys");
	assert.equal(Object.keys(m).includes("_private"), false, "non enumerable key not found in Object.keys");
	assert.equal(Object.getOwnPropertyNames(m).length, 2, "non enumerable key not counted by Object.getOwnPropertyNames");
	assert.equal(Object.getOwnPropertyNames(m).includes("_private"), false, "non enumerable key not found in Object.getOwnPropertyNames");
	assert.equal("normal" in m, true, "enumerable key found with operator in")
	assert.equal("_private" in m, false, "non enumerable key not found with operator in")
	assert.equal(Object.getOwnPropertyDescriptor(m, "normal").value, 45, "getOwnProperyDescriptor trap for normal prop")
	assert.equal(Object.getOwnPropertyDescriptor(m, "_private"), undefined, "getOwnProperyDescriptor for private prop")

	let M = ObjectModel({ _p: Number })
	m = M({ _p: 42 })

	assert.throws(function () {
		Object.prototype.toString.call(m._p);
	}, /TypeError[\s\S]*cannot access to private/, "try to access private from outside");

	M.prototype.incrementPrivate = function () { this._p++ }
	M.prototype.getPrivate = function () { return this._p }
	m.incrementPrivate();
	assert.equal(m.getPrivate(), 43, "can access and mutate private props through methods")

	const A = ObjectModel({
		_id: [Number]
	}).defaultTo({
		getId() { return this._id },
		setId(id) { this._id = id; }
	})

	let a = new A({})
	a.setId(32);
	assert.equal(a.getId(), 32, "methods should be able to access and modify private vars");

	const B = ObjectModel({
		ID: [Number]
	}).defaultTo({
		setId(id) { this.ID = id; }
	})

	let b = new B({ ID: 0 })
	assert.throws(() => { b.setId(32) }, /TypeError: cannot modify constant property ID/, "methods should not be able to modify constants");

	const Circle = ObjectModel({
		radius: Number,    // public
		_index: Number,    // private
		UNIT: ["px", "cm"], // constant
		_ID: [Number],     // private and constant
	}).defaultTo({
		_index: 0,
		getIndex() { return this._index },
		setIndex(value) { this._index = value }
	});

	let c = new Circle({ radius: 120, UNIT: "px", _ID: 1 });
	c.radius = 100;

	assert.throws(() => { c.UNIT = "cm" }, /TypeError: cannot modify constant property UNIT/, "cannot redefine constant");
	assert.throws(() => { c._index = 1; }, /TypeError: cannot modify private property _index/, "cannot modify private property")
	assert.throws(() => { c._index }, /TypeError: cannot access to private property _index/, "cannot access private property")

	c.setIndex(2);
	assert.strictEqual(c.getIndex(), 2, "can access and mutate private through method");

	// change the private convention for all models
	let initialConventionForPrivate = Model.prototype.conventionForPrivate;
	Model.prototype.conventionForPrivate = key => key === "radius";

	// remove the constant convention for Circle model
	Circle.conventionForConstant = () => false;

	c.UNIT = "cm";
	assert.strictEqual(c.UNIT, "cm", "constant convention can be changed specifically for model")

	assert.throws(() => { c.radius }, /TypeError[\s\S]*cannot access to private property/, "private convention can be changed")
	c._index = 3;
	assert.strictEqual(c._index, 3, "private convention can be changed and privates can be accessed and mutated")

	Model.prototype.conventionForPrivate = initialConventionForPrivate;

	class OM extends ObjectModel({
		_privString: [String],
		pubNum: [Number]
	}) { }

	class ParentOM extends ObjectModel({
		_id: [String],
		om: OM
	}) { }


	let nestedOM = new OM({
		_privString: "only for me",
		pubNum: 42
	});

	let parent = new ParentOM({ om: nestedOM });
	assert.ok(parent instanceof ParentOM, "can nest private prop in a child OM");
	assert.throws(() => parent.om._privString, /TypeError[\s\S]*cannot access to private property/, "cannot access nested private prop in a child OM");

	const O = ObjectModel({ _priv: String }).defaultTo({
		getPriv() {
			this.randomMethod();
			return this._priv
		},
		randomMethod() { }
	})

	const o = new O({ _priv: "test" })
	assert.strictEqual(o.getPriv(), "test", "can grant private access even if several methods are called");
});

QUnit.test("Non-enumerable and non-writable properties with overridden convention", function (assert) {

	const myModel = ObjectModel({
		private_prop: Number,
		constant_prop: Number,
		normal_prop: Number
	});

	myModel.conventionForConstant = s => s.indexOf("constant_") === 0;
	myModel.conventionForPrivate = s => s.indexOf("private_") === 0;

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

	const Woman = Person.extend({ female: true });

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

	let Vehicle = { speed: Number };
	let Car = Object.create(Vehicle);
	let Ferrari = ObjectModel({ expensive: true }).extend(Car);
	assert.ok("speed" in Ferrari.definition, "should retrieve definitions from parent prototypes when extending with objects");

	Vehicle = function () { };
	Vehicle.prototype.speed = 99;
	Car = function () { };
	Car.prototype = new Vehicle();
	Ferrari = ObjectModel({ price: [Number] }).extend(Car);

	let ferrari = new Ferrari({ price: 999999 });
	assert.equal(ferrari.speed, 99, "should retrieve properties from parent prototypes when extending with constructors");
	assert.equal("price" in ferrari, true, "should trap in operator and return true for properties in definition");
	assert.equal("speed" in ferrari, false, "should trap in operator and return false for properties out of definition");

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

	A.defaultTo({
		a: false,
		b: false
	});

	B.defaultTo({
		b: 0,
		c: 0
	});

	C.defaultTo({
		c: "",
		d: {
			d1: false,
			d2: false
		}
	});

	D.defaultTo({
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
		mother: Person.extend({ female: true }),
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
		children: [],
		grandparents: []
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

	assert.ok(Person.test(duckmother), "Autocasting for object properties 1/2");
	assert.notOk(duckmother instanceof Person, "Autocasting for object properties 2/2");

	joefamily.mother.name = "Daisy";
	assert.equal(joefamily.mother.name, "Daisy", "Autocasted submodel property can be modified");
	assert.throws(function () {
		joefamily.mother.female = "Quack !";
	}, /TypeError[\s\S]*female/, "validation of submodel autocasted at modification");

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
	}, /TypeError[\s\S]*female/, "validation of submodel autocasted at instanciation");

});

QUnit.test("Assertions", function (assert) {

	const NestedModel = ObjectModel({ foo: { bar: { baz: Boolean } } })
		.assert(o => o.foo.bar.baz === true);

	const nestedModel = NestedModel({ foo: { bar: { baz: true } } });

	assert.throws(function () {
		nestedModel.foo.bar.baz = false;
	}, /TypeError/, "test assertion after nested property assignment");

	function assertFail() {
		return false;
	}

	function assertFailWithData() {
		return -1;
	}

	Model.prototype.assert(assertFail, "expected message without data");
	ObjectModel.prototype.assert(assertFailWithData, function (data) {
		return "expected message with data " + data;
	});

	assert.equal(Model.prototype.assertions.length, 1, "check number of assertions on BasicModel.prototype")
	assert.equal(ObjectModel.prototype.assertions.length, 2, "check number of assertions on ObjectModel.prototype");

	const M = ObjectModel({ a: String });

	assert.throws(function () {
		M({ a: "test" })
	}, /TypeError/, "expected message without data");

	assert.throws(function () {
		M({ a: "test" })
	}, /TypeError/, "expected message with data -1");

	// clean up global assertions
	Model.prototype.assertions = [];
	delete ObjectModel.prototype.assertions;

	const AssertObject = ObjectModel({ name: [String] })
		.assert((o => o.name.toLowerCase().length === o.name.length), "may throw exception");

	new AssertObject({ name: "joe" });

	assert.throws(function () {
		new AssertObject({ name: undefined });
	},
	/assertion "may throw exception" returned TypeError.*for value {\s+name: undefined\s+}/,
	"assertions catch exceptions on Object models");

});

QUnit.test("test method", function (assert) {

	const assertFunction = (c => c === "GB");

	assertFunction.toString = function () {
		return "expected assertFunction toString";
	}

	const Address = new ObjectModel({
		city: String,
		country: BasicModel(String).assert(assertFunction, "Country must be GB")
	});

	function isPositive(n) { return n > 0 }
	const PositiveNumber = BasicModel(Number)
		.assert(isPositive, "expected assertion description")
		.as('PositiveNumber');

	const gbAddress = { city: "London", country: "GB" };
	const frAddress = { city: "Paris", country: "FR" };

	const Order = new ObjectModel({
		sku: String,
		address: Address,
		quantity: [PositiveNumber]
	});

	const gbOrder = { sku: "ABC123", address: gbAddress };
	const frOrder = { sku: "ABC123", address: frAddress };

	new Order(gbOrder); // no errors
	assert.throws(function () {
		new Order(frOrder);
	}, "should validate sub-objects assertions");

	let errors = [];
	Order.test(frOrder, function (err) {
		errors.push(...err);
	});

	assert.equal(errors.length, 1, "should throw exactly one error here")
	assert.equal(errors[0].expected, "expected assertFunction toString", "check assertion error expected parameter");
	assert.equal(errors[0].received, "FR", "check assertion error received parameter");
	assert.equal(errors[0].path, "address.country", "check assertion error path parameter");
	assert.equal(errors[0].message, 'assertion "Country must be GB" returned false for address.country = "FR"', "check assertion error message parameter");

	gbOrder.quantity = -1
	errors = [];
	Order.test(gbOrder, function (err) {
		errors.push(...err);
	});

	assert.equal(errors.length, 1, "should throw exactly one error here")
	assert.equal(errors[0].expected, isPositive, "check assertion error expected parameter");
	assert.equal(errors[0].received, "-1", "check assertion error received parameter");
	assert.equal(errors[0].path, "quantity", "check assertion error path parameter");
	assert.equal(errors[0].message, `assertion "expected assertion description" returned false for quantity = -1`, "check assertion error message parameter");

});

QUnit.test("Cyclic detection", function (assert) {

	let A, B, a, b;

	A = ObjectModel({ b: [] });
	B = ObjectModel({ a: A });
	A.definition.b = [B];

	a = A();
	b = B({ a: a });

	assert.ok(a.b = b, "valid cyclic value assignment");
	assert.throws(function () { a.b = a; }, /TypeError/, "invalid cyclic value assignment");

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
	assert.throws(function () {
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
	assert.throws(function () { joe.sweetie = "dog" }, /TypeError/, "website example invalid assignment 1");
	assert.throws(function () { joe.sweetie = joe }, /TypeError/, "website example invalid assignment 2");

});

QUnit.test("Custom error collectors", function (assert) {

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
	}).test({
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

	M = ObjectModel({ x: Number });
	M.errorCollector = function noop() { };

	assert.equal(M.test({ x: "nope" }), false, "model.test should work even when errorCollector does not throw exceptions");

});

QUnit.test("Automatic model casting", function (assert) {

	let User = new ObjectModel({ username: String, email: String })
		.defaultTo({ username: 'foo', email: 'foo@foo' });

	let Article = new ObjectModel({ title: String, user: User })
		.defaultTo({ title: 'bar', user: new User() });

	let a = new Article();
	a.user = { username: 'joe', email: 'foo' };

	assert.ok(a.user instanceof User, "automatic model casting when assigning an autocasted object");
	assert.ok(a.user.username === "joe", "preserved props after automatic model casting of autocasted object");

	User = new ObjectModel({ username: String, email: String })
		.defaultTo({ username: 'foo', email: 'foo@foo' });

	Article = new ObjectModel({ title: String, user: [User] })
		.defaultTo({ title: 'bar', user: new User() });

	a = new Article();
	a.user = { username: 'joe', email: 'foo' };

	assert.ok(a.user instanceof User, "automatic optional model casting when assigning an autocasted object");
	assert.ok(a.user.username === "joe", "preserved props after automatic optional model casting of autocasted object");


	const Type1 = ObjectModel({ name: String, other1: [Boolean] });
	const Type2 = ObjectModel({ name: String, other2: [Number] });
	const Container = ObjectModel({ foo: { bar: [Type1, Type2] } });

	consoleMock.apply();
	let c = new Container({ foo: { bar: { name: "dunno" } } });

	assert.ok(/Ambiguous model for[\s\S]*?name: "dunno"[\s\S]*?other1: \[Boolean][\s\S]*?other2: \[Number]/
		.test(consoleMock.lastArgs.warn[0]),
	"should warn about ambiguous model for object sub prop"
	);
	assert.ok(c.foo.bar.name === "dunno", "should preserve values even when ambiguous model cast");
	assert.ok(!(c.foo.bar instanceof Type1 || c.foo.bar instanceof Type2), "should not cast when ambiguous model");
	consoleMock.revert();

	consoleMock.apply();
	c = new Container({ foo: { bar: Type2({ name: "dunno" }) } });
	assert.ok(consoleMock.lastArgs.warn.length === 0, "should not warn when explicit model cast in ambiguous context");
	assert.ok(c.foo.bar.name === "dunno", "should preserve values when explicit model cast in ambiguous context");
	assert.ok(c.foo.bar instanceof Type2, "should preserve model when explicit cast in ambiguous context");
	consoleMock.revert();

	let noProto = Object.create(null);
	noProto.x = true;
	let noProtoModel = ObjectModel({ x: Boolean })
	let noProtoInstance = noProtoModel(noProto)
	assert.equal(noProtoInstance.x, true, "should be able to init with no-proto objects");
	noProtoInstance.y = Object.create(null);
	assert.ok(typeof noProtoInstance.y === "object", "should be able to mutate and cast with no-proto objects");

})

QUnit.test("delete trap", function (assert) {

	const M = ObjectModel({ _p: Boolean, C: Number, u: undefined, n: null, x: [Boolean] })
	const m = M({ _p: true, C: 42, u: undefined, n: null, x: false })

	assert.throws(function () { delete m._p }, /TypeError.*private/, "cannot delete private prop");
	assert.throws(function () { delete m.C }, /TypeError.*constant/, "cannot delete constant prop");
	delete m.u; // can delete undefined properties
	assert.throws(function () { delete m.n }, /TypeError.*expecting n to be null, got undefined/, "delete should differenciate null and undefined");
	delete m.x // can delete optional properties

})

QUnit.test("defineProperty trap", function (assert) {

	const M = ObjectModel({ _p: Boolean, C: Number, u: undefined, n: null, x: [Boolean] })
	const m = M({ _p: true, C: 42, u: undefined, n: null, x: false })

	assert.throws(function () { Object.defineProperty(m, "_p", { value: true }) }, /TypeError.*private/, "cannot define private prop");
	assert.throws(function () { Object.defineProperty(m, "C", { value: 43 }) }, /TypeError.*constant/, "cannot define constant prop");
	assert.throws(function () { Object.defineProperty(m, "u", { value: "test" }) }, /TypeError.*expecting u to be undefined/, "check type after defineProperty");
	assert.throws(function () { Object.defineProperty(m, "n", { value: undefined }) }, /TypeError.*expecting n to be null, got undefined/, "defineProperty should differenciate null and undefined");
	Object.defineProperty(m, "x", { value: undefined }) // can define optional properties

})

QUnit.test("ownKeys/has trap", function (assert) {

	const A = ObjectModel({ _pa: Boolean, a: Boolean, oa: [Boolean] })
	const B = A.extend({ _pb: Boolean, b: Boolean, ob: [Boolean] })
	const m = B({ _pa: true, _pb: true, a: true, b: true, oa: undefined, undefined: true })
	B.prototype.B = true;
	B.prototype._PB = true;
	A.prototype.A = true;
	A.prototype._PA = true;

	assert.equal("a" in m, true, "inherited prop in")
	assert.equal("b" in m, true, "own prop in")
	assert.equal("toString" in m, true, "Object.prototype prop in")

	assert.equal("A" in m, false, "custom prop inherited prototype in")
	assert.equal("B" in m, false, "custom prop own prototype in")
	assert.equal("_pa" in m, false, "private inherited prop in")
	assert.equal("_pb" in m, false, "private own prop in")
	assert.equal("_PA" in m, false, "inherited prototype custom private prop in")
	assert.equal("_PB" in m, false, "own prototype custom private prop in")
	assert.equal("oa" in m, true, "optional assigned prop in")
	assert.equal("ob" in m, false, "optional unassigned prop in")
	assert.equal("unknown" in m, false, "unassigned undefined prop in")
	assert.equal("undefined" in m, false, "assigned undefined prop in")

	const oKeys = Object.keys(m);

	const ownKeys = Object.getOwnPropertyNames(m);

	assert.equal(oKeys.sort().join(","), "a,b,oa", "Object.keys")
	assert.equal(ownKeys.sort().join(","), "a,b,oa", "Object.getOwnPropertyNames")
})

QUnit.test("class constructors", function (assert) {

	const PersonModel = ObjectModel({ firstName: String, lastName: String, fullName: String })

	class Person extends PersonModel {
		constructor({ firstName, lastName }) {
			const fullName = `${firstName} ${lastName}`
			super({ firstName, lastName, fullName })
		}
	}

	const person = new Person({ firstName: "John", lastName: "Smith" })
	assert.ok(person instanceof Person, "person instanceof Person")
	assert.ok(person instanceof PersonModel, "person instanceof PersonModel")
	assert.equal(person.fullName, "John Smith", "check es6 class constructor")

	const UserModel = Person.extend({ role: String });
	class User extends UserModel {
		constructor({ firstName, lastName, role }) {
			super({ firstName, lastName, role })
			if (role === "admin") {
				this.fullName += " [ADMIN]"
			}
		}
	}

	const user = new User({ firstName: "John", lastName: "Smith", role: "admin" })

	assert.ok(user instanceof User, "user instanceof User")
	assert.ok(user instanceof UserModel, "user instanceof UserModel")
	assert.ok(user instanceof Person, "user instanceof Person")
	assert.ok(user instanceof PersonModel, "user instanceof PersonModel")
	assert.equal(user.fullName, "John Smith [ADMIN]", "check es6 class constructor with extended class")
	assert.equal(Object.keys(User.definition).sort().join(","), "firstName,fullName,lastName,role", "check definition keys")
	assert.equal(Object.keys(user).sort().join(","), "firstName,fullName,lastName,role", "check instance keys")
	assert.throws(function () { user.role = null; }, /TypeError/, "extended class model check definition")

	const Lovers = class Lovers extends ObjectModel({
		husband: Person,
		wife: Person,
	}) { };

	const joe = { firstName: 'Joe', lastName: "Smith" };
	const ann = new Person({ firstName: "Ann", lastName: "Smith" });

	const couple = new Lovers({
		husband: joe, // object autocasted
		wife: ann, // object model
	});

	assert.ok(couple.husband instanceof Person, "autocasting works with class-based models");

	assert.equal(Person.test({ firstName: 0, lastName: "" }), false, `test method with class-based models`);

	class Request extends ObjectModel({ id: [Number] }) {
		setId(id) {
			this.id = id;
		}
	}

	let x = new Request({});
	assert.throws(function () { x.setId("32") }, /TypeError/, "class setters methods should provide type checking");

	const BaseOM = ObjectModel({})
	let getterRequiringNoValidationCallCount = 0;
	class BaseClass extends BaseOM {
		get getterRequiringNoValidation() {
			getterRequiringNoValidationCallCount++;
			return true;
		}
	}

	const SubOM = BaseClass.extend({ test: [Boolean] }).assert(o => o.test)
	class SubClass extends SubOM { }

	SubClass.test({ test: false }, () => { });

	assert.equal(SubClass.errors.length, 0, "class-based models errors are cleaned up properly 1/4")
	assert.equal(SubOM.errors.length, 0, "class-based models errors are cleaned up properly 2/4")
	assert.equal(BaseClass.errors.length, 0, "class-based models errors are cleaned up properly 3/4")
	assert.equal(BaseOM.errors.length, 0, "class-based models errors are cleaned up properly 4/4")

	let bm = new BaseClass({});
	bm.getterRequired = bm.getterRequiringNoValidation;
	assert.equal(getterRequiringNoValidationCallCount, 1, "class getter requiring no validation only get once per call")
})

QUnit.test("Null-safe object traversal", function (assert) {
	const Config = new ObjectModel({
		local: {
			time: {
				format: ["12h", "24h", undefined]
			}
		}
	});

	const config = Config({ local: undefined }); // object autocasted

	assert.strictEqual(config.local.time.format, undefined, "null-safe object traversal getter")
	config.local.time.format = "12h";
	assert.strictEqual(config.local.time.format, "12h", "null-safe object traversal setter")
})

QUnit.test("Check once mode", function(assert){
	const Address = Model({ city: String, street: { name: String, number: Number }})
	assert.throws(function () {
		Address({ city: "Paris", street: { name: null, number: 12 }}, Model.CHECK_ONCE)
	}, /TypeError.*expecting street.name to be String/, "check once mode still checks at instanciation")
	const a = new Address({ city: "Paris", street: { name: "Champs-Elysees", number: 12 }}, Model.CHECK_ONCE)
	a.street.name = null;
	assert.strictEqual(a.street.name, null, "check once mode does not check future mutations")

	class Person extends Model({ name: String, age: Number }) {
		constructor({ name, age }) {
			super({ name, age }, Model.CHECK_ONCE)
		}
	}

	const john = new Person({ name: "John", age: 32 })
	john.age = "twelve";
	assert.strictEqual(john.age, "twelve", "check once mode does not check future mutations for extended class-based models")
})

QUnit.test("Short-circuit validation when not receiving an object as expected", function(assert){
	const PersonModel = new ObjectModel({
		FirstName: String,
		LastName: String,
	  })
	const errorsCollected = []
	PersonModel.errorCollector = function(errors){
		errorsCollected.push(...errors)
	}
	  
	PersonModel(42)
	console.log({ errorsCollected})
	assert.equal(errorsCollected.length, 1, "should only have 1 error")
	assert.equal(errorsCollected[0].message, `expecting {
	FirstName: String, 
	LastName: String 
}, got Number 42`)
})