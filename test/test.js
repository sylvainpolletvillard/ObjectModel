var consoleMock = {
	methods: ["debug","log","warn","error"],
	apply: function(){
		consoleMock.methods.forEach(function(method){
			consoleMock["_default"+method] = console[method];
			consoleMock[method+"LastArgs"] = [];
			console[method] = function(){
				consoleMock[method+"LastArgs"] = arguments;
			}
		})
	},
	revert: function(){
		consoleMock.methods.forEach(function(method){
			console[method] = consoleMock["_default"+method];
			consoleMock[method+"LastArgs"] = [];
		});
	}
};

(function testSuite(Model){

	QUnit.test( "Basic models", function( assert ) {

		assert.ok(Model instanceof Function, "Model is defined");

		var NumberModel = Model(Number);
		NumberModel(0);
		assert.ok(typeof NumberModel(42) === "number", "should return the original type");
		assert.ok(NumberModel(17) === 17, "should return the original value");
		assert.throws(function(){ NumberModel("12") }, /TypeError/, "test invalid type");
		assert.throws(function(){ NumberModel(NaN) }, /TypeError/, "test NaN is invalid");

		assert.ok(typeof NumberModel.extend === "function", "test model method extend");
		assert.ok(typeof NumberModel.assert === "function", "test model method assert");
		assert.ok(typeof NumberModel.test === "function", "test model method test");
		assert.ok(typeof NumberModel.validate === "function", "test model method validate");
		assert.ok(NumberModel.definition === Number, "test model prop definition");
		assert.ok(typeof NumberModel.assertions === "object", "test model prop assertions");

		var OptionalNumberModel = NumberModel.extend(undefined);
		assert.throws(function(){ NumberModel() }, /TypeError/, "test undefined value");
		OptionalNumberModel();

		var myModel = Model([String, Boolean, Date]);
		myModel("test");
		myModel(true);
		myModel(new Date());
		assert.throws(function(){ myModel() }, /TypeError/, "test undefined value");
		assert.throws(function(){ myModel(0) }, /TypeError/, "test invalid type");
		assert.throws(function(){ myModel(new Date("x")) }, /TypeError/, "test invalid date");

		assert.ok(myModel.test("666"), "model.test 1/2");
		assert.notOk(myModel.test(666), "model.test 2/2");

		myModel.validate("666");
		assert.throws(function(){ myModel.validate(666) }, /TypeError/, "test undefined value");

	});

	QUnit.test( "Object models", function( assert ) {

		assert.ok(Model.Object instanceof Function, "Model.Object instanceof Function");

		var Person = Model({
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
		assert.ok(Person instanceof Model && Person instanceof Function, "model is instanceof Model and Function");

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
			var joey = Person({
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

	});

	QUnit.test("Optional and multiple parameters", function(assert){
		var Person = Model({
			name: [String],
			age: [Number, Date, String, Boolean, undefined],
			female: [Boolean, Number, String, null],
			haircolor: ["blond","brown","black", undefined],
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
		joe.age = new Date(1995,1,23);
		joe.age = undefined;
        assert.throws(function(){ joe.age = null; }, /TypeError.*got null/, "invalid set null");
		joe.female = "ann";
		joe.female = 2;
		joe.female = false;
		assert.throws(function(){ joe.female = undefined; }, /TypeError.*got undefined/, "invalid set undefined");
		joe.address.work.city = "Lille";
		joe.address.work.city = undefined;
		joe.haircolor = "blond";
		joe.haircolor = undefined;
		assert.throws(function(){ joe.name = false; }, /TypeError.*expecting name to be String.*got Boolean false/, "invalid type for optional prop");
		assert.throws(function(){ joe.age = null; }, /TypeError.*expecting age to be Number or Date or String or Boolean or undefined/,"invalid set null for optional union type prop");
		assert.throws(function(){ joe.age = []; }, /TypeError.*got Array/, "invalid set array for optional union type prop");
		assert.throws(function(){ joe.address.work.city = 0; }, /TypeError.*expecting address.work.city to be String.*got Number 0/,"invalid type for nested optional prop");
		assert.throws(function(){ joe.haircolor = ""; }, /TypeError.*expecting haircolor to be "blond" or "brown" or "black" or undefined, got String ""/, "invalid type for value enum prop");

	});

	QUnit.test("Fixed values", function(assert){
		var myModel = Model({
			a: [1,2,3],
			b: 42,
			c: ["",false,null,0],
			haircolor: ["blond","brown","black"],
			foo: "bar",
			x: [Number, true]
		});

		var model = myModel({
			a:1,
			b:42,
			c: 0,
			haircolor: "blond",
			foo: "bar",
			x: true
		});

		model.x = 666;
		model.haircolor="brown";

		assert.throws(function(){ model.a = 4; }, /TypeError.*expecting a to be 1 or 2 or 3.*got Number 4/,'invalid set on values enum 1/2');
		assert.throws(function(){ model.b = 43; }, /TypeError.*expecting b to be 42.*got Number 43/,"invalid set on fixed value 1/2");
		assert.throws(function(){ model.c = undefined; }, /TypeError.*expecting c to be "" or false or null or 0.*got undefined/, "invalid set undefined on mixed typed values enum");
		assert.throws(function(){ model.haircolor = "roux"; }, /TypeError.*expecting haircolor to be "blond" or "brown" or "black".*got String "roux"/,'invalid set on values enum 2/2');
		assert.throws(function(){ model.foo = "baz"; }, /TypeError.*expecting foo to be "bar".*got String "baz"/,"invalid set on fixed value 2/2");
		assert.throws(function(){ model.x = false; }, /TypeError.*expecting x to be Number or true.*got Boolean false/, "invalid set on mixed type/values enum");

	});

	QUnit.test("Array models", function(assert){

		assert.ok(Model.Array instanceof Function, "Model.Array is declared");

		var Arr = Model.Array(Number);
		var a, b, c, d;

		assert.ok(Arr instanceof Model.Array && Arr instanceof Function, "Array models can be declared");
		a = Arr([]);
		assert.ok(a instanceof Arr && a instanceof Array, "Array models can be instanciated");

		a.push(1);
		a[0] = 42;
		a.splice(1,0,5,6,Infinity);
		assert.throws(function(){ a.push("toto"); }, /TypeError/, "push calls are catched");
		assert.throws(function(){ a[0] = {}; }, /TypeError/, "array keys set are catched");
		assert.throws(function(){ a.splice(1,0,7,'oups',9); }, /TypeError/, "splice calls are catched");
		assert.equal(a.length, 4, "array length change is ok");

		b = Arr([1,2,3]);
		assert.equal(b.length, 3, "array.length is ok");

		assert.throws(function(){
			c = Arr([1,false,3]);
		}, /TypeError/, "validation in array model constructor 1/2");

		assert.throws(function(){
			d = Arr([1,2,3,function(){}]);
		}, /TypeError/, "validation in array model constructor 2/2");


		var Question = Model({
			answer: Number
		});

		Arr = Model.Array([Question,String,Boolean]);
		a = Arr(["test"]);
		a.unshift(true);
		a.push(Question({ answer: 42 }));
		a.push({ answer: 43 });
		assert.throws(function(){a.unshift(42); }, /TypeError/, "unshift multiple types");
		assert.throws(function(){a[0] = null; }, /TypeError/, "set index multiple types");

		Arr = Model.Array([true,2,"3"]);
		assert.throws(function(){ a = Arr(["3",2,true,1]); }, /TypeError[\s\S]*Array\[3]/, "Model.Array fixed values");

		var Cards = Model.Array([Number, "J","Q","K"]); // array of Numbers, J, Q or K
		var Hand = Cards.extend().assert(function(cards){
			return cards.length === 2;
		});
		var pokerHand = new Hand(["K",10]);

		assert.ok(Object.getPrototypeOf(Hand.prototype) === Cards.prototype, "extension respect prototypal chain");
		assert.ok(pokerHand instanceof Hand && pokerHand instanceof Cards, "array model inheritance");
		Cards(["K",10]).push(7);
		assert.throws(function(){ Hand(["K",10]).push(7); }, /TypeError/, "min/max of inherit array model");

		var CheaterHand = Cards.extend("joker");
		CheaterHand(["K",10,"joker"]);
		assert.throws(function(){ Hand("K",10, "joker"); }, /TypeError/, "array model type extension");

		var ChildO = Model.Object({ arr: Model.Array(String) });
		var ParentO = Model.Object({ child: ChildO });

		var childO = ChildO({ arr: ["a","b","c"] });
		assert.ok(childO.arr instanceof Array, "child array model is array");
		var parentO = ParentO({ child: childO });
		assert.ok(parentO.child.arr instanceof Array, "child array model from parent is array");

		childO.arr.push("a");
		assert.throws(function(){ childO.arr.push(false); }, /TypeError/, "child array model catches push calls");
		assert.throws(function(){ childO.arr[0] = 1; }, /TypeError/, "child array model catches set index");

	});

	QUnit.test("Function models", function(assert){

		assert.equal(typeof Model.Function, "function", "Model.Function is defined");

		var op = Model.Function(Number, Number).return(Number);

		assert.ok(op instanceof Model.Function && op instanceof Function, "model instanceof Model.Function and Function");

		var add = op(function(a,b){ return a + b; });
		var add3 = op(function(a,b,c){ return a + b + c; });
		var noop = op(function(a, b){ return undefined; });
		var addStr = op(function(a,b){ return String(a) + String(b); });

		assert.ok(add instanceof Function && add instanceof op, "fn instanceof functionModel and Function");

		assert.equal(add(15,25),40, "valid function model call");
		assert.throws(function(){ add(15) }, /TypeError/, "too few arguments");
		assert.throws(function(){ add3(15,25,42) }, /TypeError/, "too much arguments");
		assert.throws(function(){ noop(15,25) }, /TypeError/, "no return");
		assert.throws(function(){ addStr(15,25) }, /TypeError/, "incorrect return type");

		var Person = Model({
			name: String,
			age: Number,
			// function without arguments returning a String
			sayMyName: Model.Function().return(String)
		}).defaults({
			sayMyName: function(){
				return "my name is " + this.name;
			}
		});

		var greetFnModel = Model.Function(Person).return(String);
		Person.prototype.greet = greetFnModel(function(otherguy){
			return "Hello "+ otherguy.name + ", " + this.sayMyName();
		});

		var joe = new Person({ name: "Joe", age: 28 });
		var ann = new Person({ name: "Ann", age: 23 });


		assert.equal(joe.sayMyName(), "my name is Joe", "valid function model method call 1/2");
		assert.equal(joe.greet(ann), "Hello Ann, my name is Joe", "valid function model method call 2/2");

		assert.throws(function(){ joe.greet("dog"); }, /TypeError/, "invalid argument type");

		var Calculator = Model.Function(Number, ["+","-","*","/"], Number)
			.defaults(0,"+",1)
			.return(Number);

		var calc = new Calculator(function(a,operator,b){
			return eval(a+operator+b);
		});

		assert.equal(calc(3,"+"), 4, "default argument value");
		assert.equal(calc(41), 42, "defaults arguments values");
		assert.throws(function(){ calc(6,"*",null); }, /TypeError/, "invalid argument type");

		var api = Model.Function({
			list: Model.Array(Number),
			op: ["sum","product"]
		})(function(options){
			return options.list.reduce(function(a, b){
				switch(options.op){
					case "sum": return a + b; break;
					case "product": return a * b; break;
				}
			}, options.op === "product" ? 1 : 0);
		});

		assert.equal(api({ list: [1,2,3,4], op: "sum"}), 10, "Model.Function object argument 1/5");
		assert.equal(api({ list: [1,2,3,4], op: "product"}), 24,  "Model.Function object argument 2/5");
		assert.throws(function(){ api({ list: [1,2,"3",4], op: "product"}); }, /TypeError/,  "Model.Function object argument 3/5");
		assert.throws(function(){ api({ list: [1,2,3,4], op: "divide"}); }, /TypeError/,  "Model.Function object argument 4/5");
		assert.throws(function(){ api({ list: [1,2,3,4]}); }, /TypeError/,  "Model.Function object argument 5/5");
	});

	QUnit.test("Default values", function(assert){

		// Basic models
		var myModel = Model([String, Boolean, Date]);
		myModel.defaultTo("blob");
		assert.strictEqual(myModel.default, "blob", "basic model defaultTo store the value as default property")
		assert.strictEqual(myModel(), "blob", "basic model default property is applied when undefined is passed");
		myModel.default = 42;
		assert.throws(function(){ myModel() }, /TypeError.*got Number 42/, "basic model invalid default property still throws TypeError");

		myModel = new Model({
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
		var model = myModel();
		assert.strictEqual(model.name,"joe", "defaults values correctly applied");
		assert.strictEqual(model.foo.bar.buz, 0, "defaults nested props values correctly applied");
		assert.ok(myModel.test({}), "defaults should be applied when testing duck typed objects")

		var model2 = myModel({ name: "jim", foo:{ bar: { buz: 1 }}});
		assert.strictEqual(model2.name, "jim", "defaults values not applied if provided");
		assert.strictEqual(model2.foo.bar.buz, 1, "defaults nested props values not applied if provided");

		var op = new Model.Function(Number, Number).return(Number).defaults(11,31);
		var add = op(function(a,b){ return a + b; });
		assert.equal(add(), 42, "defaults arguments for function models correctly applied");

		var myModel = new Model.Object({ x: Number, y: String })
			.defaultTo({ x: 42 })
			.defaults({ y: "hello" })
		assert.strictEqual(myModel.default.x, 42, "object model defaultTo store the value as default property")
		assert.strictEqual(myModel.prototype.y, "hello", "object model defaults store values to proto")
		assert.strictEqual(myModel().x, 42, "object model default property is applied when undefined is passed");
		assert.strictEqual(myModel().y, "hello", "defaulted object model still inherit from model proto");
		assert.strictEqual(myModel.default.y, undefined, "object model default value itself does not inherit from from model proto");
		myModel.default.x = "nope";
		assert.throws(function(){ myModel() }, /TypeError.*got String "nope"/, "invalid default property still throws TypeError for object models");

		var ArrModel = Model.Array([Number, String]).defaultTo([]);
		var a = ArrModel();
		assert.ok(a instanceof Array && a.length === 0, "Array model default value");
		ArrModel.default.push(1,2,3);
		a = ArrModel();
		assert.ok(a.length === 3 && a.join(";") == "1;2;3", "array model default value is mutable array");
		ArrModel.default = "nope";
		assert.throws(function(){ ArrModel() }, /TypeError.*got String "nope"/, "invalid default property still throws TypeError for array models");

		var yell = Model.Function(String).return(String).defaultTo(function(s){ return s.toUpperCase() });
		assert.strictEqual(yell()("yo!"), "YO!", "Function model default value");
		assert.throws(function(){ yell()(42) }, /TypeError.*got Number 42/, "invalid arguments still throws TypeError for defaulted function models");
		yell.default = function(s){ return s.length };
		assert.throws(function(){ yell()("yo!") }, /TypeError.*got Number 3/, "invalid default property still throws TypeError for function models");

	});

	QUnit.test("RegExp values", function(assert){

		var myModel = Model({
			phonenumber: /^[0-9]{10}$/,
			voyels: [/^[aeiouy]+$/]
		});

		var m = myModel({
			phonenumber: "0612345678"
		});

		m.voyels = "ouioui";
		assert.throws(function(){m.voyels = "nonnon" }, /TypeError/, "regex matching");
		assert.throws(function(){m.phonenumber = "123456789" }, /TypeError/, "regex matching 2");

	});

	QUnit.test("Non-enumerable and non-writable properties", function(assert){

		var myModel = Model({
			CONST: Number,
			_private: Number,
			normal: Number
		});

		var m = myModel({
			CONST: 42,
			_private: 43,
			normal: 44
		});

		m.normal++;
		m._private++;
		assert.throws(function(){ m.CONST++; }, /TypeError[\s\S]*constant/, "try to redefine constant");
		assert.equal(Object.keys(m).length, 2, "non enumerable key not counted by Object.keys");
		assert.equal(Object.keys(m).includes("_private"), false, "non enumerable key not found in Object.keys");
		assert.equal(Object.getOwnPropertyNames(m).length, 2, "non enumerable key not counted by Object.getOwnPropertyNames");
		assert.equal(Object.getOwnPropertyNames(m).includes("_private"), false, "non enumerable key not found in Object.getOwnPropertyNames");
		assert.equal("normal" in m, true, "enumerable key found with operator in")
		assert.equal("_private" in m, false, "non enumerable key not found with operator in")

	});

	QUnit.test("Extensions", function(assert){

		var Person = Model({
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

		var Woman = Person.extend({ female: true });

		assert.ok(Person(joe), "Person valid model for joe");

		assert.throws(function(){ Woman(joe); }, /TypeError[\s\S]*female/, "Woman invalid model for joe");

		assert.throws(function(){
			var _joe = Woman({
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
		}, /TypeError[\s\S]*female/, "cant be woman from joe parameters");

		assert.throws(function(){
			var _joe = Woman(joe);
		}, /TypeError[\s\S]*female/, "cant be woman from Person joe");

		var ann = Woman({
			name: "Joe's wife",
			age: 42,
			birth: new Date(1990,3,25),
			female: true,
			address: {
				work: {
					city: "Lille"
				}
			}
		});

		var UnemployedWoman = Woman.extend({
			address: {
				work: {
					city: undefined
				}
			}
		});

		assert.ok(Woman(ann), "Woman valid model for ann");

		assert.throws(function(){
			UnemployedWoman(ann);
		}, /TypeError[\s\S]*city/, "ann cant be UnemployedWoman;  model extension nested undefined property");


		var jane = UnemployedWoman({
			name: "Jane",
			age: 52,
			birth: new Date(1990,3,25),
			female: true
		});

		assert.ok(ann instanceof Person,"ann instanceof Person");
		assert.ok(ann instanceof Woman,"ann instanceof Woman");
		assert.ok(jane instanceof Person,"jane instanceof Person");
		assert.ok(jane instanceof Woman, "jane instanceof Woman");
		assert.ok(jane instanceof UnemployedWoman, "jane instanceof UnemployedWoman");
		assert.equal(joe instanceof Woman, false, "joe not instanceof Woman");
		assert.equal(joe instanceof UnemployedWoman, false, "joe not instanceof UnemployedWoman");
		assert.equal(ann instanceof UnemployedWoman, false, "ann not instanceof UnemployedWoman");

		var Vehicle = { speed: Number };
		var Car = Object.create(Vehicle);
		Car.wheels = 4;
		var Ferrari = Model({ expensive: true }).extend(Car);
		assert.ok("speed" in Ferrari.definition, "should retrieve definitions from parent prototypes when extending with objects");

		Vehicle = function(){};
		Vehicle.prototype.speed = 99;
		Car = function(){};
		Car.prototype = new Vehicle();
		Car.prototype.wheels = 4;
		Ferrari = Model.Object().extend(Car);
		assert.ok("speed" in new Ferrari(), "should retrieve properties from parent prototypes when extending with constructors");


	});

	QUnit.test("Multiple inheritance", function(assert){

		var A = new Model({ // or Model.Object
			a: Boolean,
			b: Boolean
		});

		var B = Model({
			b: Number,
			c: Number
		});

		var C = Model({
			c: String,
			d: {
				d1: Boolean,
				d2: Boolean
			}
		});

		var D = Model({
			a: String,
			d: {
				d2: Number,
				d3: Number
			}
		});

		var M1 = A.extend(B,C,D);
		var M2 = D.extend(C,B,A);

		assert.equal(Object.keys(M1.definition).sort().join(','), "a,b,c,d", "definition merge for multiple inheritance 1/4");
		assert.equal(Object.keys(M2.definition).sort().join(','), "a,b,c,d", "definition merge for multiple inheritance 2/4");
		assert.equal(Object.keys(M1.definition.d).sort().join(','), "d1,d2,d3", "definition merge for multiple inheritance 3/4");
		assert.equal(Object.keys(M2.definition.d).sort().join(','), "d1,d2,d3", "definition merge for multiple inheritance 4/4");

		var m1 = M1({
			a: "",
			b: 42,
			c: "test",
			d: {
				d1: true,
				d2: 2,
				d3: 3
			}
		});

		var m2 = M2({
			a: false,
			b: false,
			c: 666,
			d: {
				d1: false,
				d2: false,
				d3: 0
			}
		});

		assert.throws(function(){ m1.a = true; }, /TypeError[\s\S]*a/, "type checking multiple inheritance 1/8");
		assert.throws(function(){ m2.a = "nope"; }, /TypeError[\s\S]*a/, "type checking multiple inheritance 2/8");
		assert.throws(function(){ m1.b = !m1.b; }, /TypeError[\s\S]*b/, "type checking multiple inheritance 3/8");
		assert.throws(function(){ m2.b += 7; }, /TypeError[\s\S]*b/, "type checking multiple inheritance 4/8");
		assert.throws(function(){ m1.c = undefined; }, /TypeError[\s\S]*c/, "type checking multiple inheritance 5/8");
		assert.throws(function(){ m2.c = null; }, /TypeError[\s\S]*c/, "type checking multiple inheritance 6/8");
		assert.throws(function(){ m1.d.d2 = true; }, /TypeError[\s\S]*d2/, "type checking multiple inheritance 7/8");
		assert.throws(function(){ m2.d.d2 = 1; }, /TypeError[\s\S]*d2/, "type checking multiple inheritance 8/8");

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

		M1 = A.extend(B,C,D);
		M2 = D.extend(C,B,A);
		m1 = M1();
		m2 = M2();

		assert.ok(m1.a === "" && m1.b === 0 && m1.c === "" && m1.d.d1 === false && m1.d.d2 === 0 && m1.d.d3 === 0, "defaults checking multiple inheritance 1/2");
		assert.ok(m2.a === false && m2.b === false && m2.c === 0 && m2.d.d1 === false && m2.d.d2 === false && m2.d.d3 === 0, "defaults checking multiple inheritance 2/2");

		function dummyAssert(){ return true; }
		A.assert(dummyAssert);
		B.assert(dummyAssert);
		C.assert(dummyAssert);
		D.assert(dummyAssert);

		M1 = A.extend(B,C,D);
		M2 = D.extend(C,B,A);
		m1 = M1();
		m2 = M2();

		assert.ok(M1.assertions.length === 4, "assertions checking multiple inheritance 1/2");
		assert.ok(M2.assertions.length === 4, "assertions checking multiple inheritance 2/2");

	});

	QUnit.test("Composition", function(assert){

		var Person = Model({
			name: String,
			age: [Number, Date],
			female: [Boolean],
			address: {
				work: {
					city: [String]
				}
			}
		});

		var Family = Model({
			father: Person,
			mother: Person.extend({ female: true }),
			children: Model.Array(Person),
			grandparents: [Model.Array(Person).assert(function(persons){
				return persons && persons.length <= 4
			})]
		});

		var joe = Person({
			name: "Joe",
			age: 42,
			female: false
		});


		var ann = new Person({
			female: true,
			age: joe.age - 5,
			name: joe.name+"'s wife"
		});

		var joefamily = new Family({
			father: joe,
			mother: ann,
			children: []
		});

		assert.ok(joefamily instanceof Family, "joefamily instance of Family");
		assert.ok(joefamily.father instanceof Person, "father instanceof Person");
		assert.ok(joefamily.mother instanceof Person, "mother instanceof Person");

		var duckmother = {
			female: true,
			age: joe.age - 5,
			name: joe.name+"'s wife"
		};

		var joefamily = new Family({
			father: joe,
			mother: duckmother,
			children: []
		});

		assert.ok(Person.test(duckmother), "Duck typing for object properties 1/2");
		assert.notOk(duckmother instanceof Person, "Duck typing for object properties 2/2");

		joefamily.mother.name = "Daisy";
		assert.throws(function(){
			joefamily.mother.female = "Quack !";
		}, /TypeError[\s\S]*female/, "validation of submodel duck typed at modification");

		assert.throws(function(){
			var joefamily = new Family({
				father: joe,
				mother: {
					female: false,
					age: joe.age - 5,
					name: joe.name+"'s wife"
				},
				children: []
			});
		}, /TypeError[\s\S]*female/, "validation of submodel duck typed at instanciation");

	});

	QUnit.test("Assertions", function(assert){

		function isOdd(n){ return n%2 === 1; }
		var OddNumber = Model(Number).assert(isOdd);
		assert.strictEqual(OddNumber(17), 17, "passing assertion on basic model 1/2");
		assert.throws(function(){ OddNumber(18) }, /TypeError[\s\S]*isOdd/, "failing assertion on basic model 1/2");

		var RealNumber = Model(Number).assert(isFinite);

		assert.equal(RealNumber(Math.sqrt(1)), 1, "passing assertion on basic model 2/2");
		assert.throws(function(){ RealNumber(Math.sqrt(-1)) }, /TypeError[\s\S]*isFinite/, "failing assertion on basic model 2/2");

		function isPrime(n) {
			for (var i=2, m=Math.sqrt(n); i <= m ; i++){
				if(n%i === 0) return false;
			}
			return true;
		}

		// polyfill for IE
		Number.isInteger = Number.isInteger || function isInteger(value) {
			return typeof value === "number" &&
				isFinite(value) &&
				Math.floor(value) === value;
		};

		var PrimeNumber = RealNumber
			.extend() // to not add next assertions to RealNumber model
			.assert(Number.isInteger)
			.assert(isPrime);

		PrimeNumber(83);
		assert.throws(function(){ PrimeNumber(87); }, /TypeError[\s\S]*isPrime/, "test multiple assertions 1");
		assert.throws(function(){ PrimeNumber(7.77); }, /TypeError[\s\S]*isInteger/, "test multiple assertions 2");

		var ArrayMax3 = Model.Array(Number).assert(function maxRange(arr){ return arr.length <= 3; });
		var arr = ArrayMax3([1,2]);
		arr.push(3);
		assert.throws(function(){ arr.push(4); }, /TypeError[\s\S]*maxRange/, "test assertion after array method");

		var ArraySumMax10 = Model.Array(Number).assert(function(arr){
			return arr.reduce(function(a,b){ return a+b; },0) <= 10;
		});

		arr = ArraySumMax10([2,3,4]);
		assert.throws(function(){ arr[1] = 7; }, /TypeError/, "test assertion after array key assignment");

		var NestedModel = Model.Object({ foo: { bar: { baz: Boolean }}}).assert(function(o){
			return o.foo.bar.baz === true;
		});
		var nestedModel = NestedModel({ foo: { bar: { baz: true }}});
		assert.throws(function(){ nestedModel.foo.bar.baz = false; }, /TypeError/, "test assertion after nested property assignment");

		function assertFail(){ return false; }
		function assertFailWithData(){ return -1; }
		Model.prototype.assert(assertFail, "expected message without data");
		Model.Object.prototype.assert(assertFailWithData, function(data){ return "expected message with data "+data; });

		assert.equal(Model.prototype.assertions.length, 1, "check number of assertions on Model.prototype")
		assert.equal(Model.Object.prototype.assertions.length, 2, "check number of assertions on ObjectModel.prototype");

		var M = Model({ a: String });
		assert.throws(function(){ var m = M({ a: "test" }) }, /TypeError/, "expected message without data");
		assert.throws(function(){ var m = M({ a: "test" }) }, /TypeError/, "expected message with data -1");

		// clean up global assertions
		Model.prototype.assertions = [];
		delete Model.Object.prototype.assertions;

		var AssertBasic = Model(Number).assert(function(v){ return +v.toString() == v }, "may throw exception")
		new AssertBasic(0);
		assert.throws(function(){ new AssertBasic(); },
			/assertion \"may throw exception\" returned TypeError.*for value undefined/,
			"assertions catch exceptions on Basic models");

		var AssertObject = Model.Object({ name: [String] })
			.assert(function(o){ return o.name.toLowerCase().length == o.name.length }, "may throw exception");
		new AssertObject({ name: "joe" });
		assert.throws(function(){ new AssertObject({ name: undefined }); },
			/assertion \"may throw exception\" returned TypeError.*for value {\s+name: undefined\s+}/,
			"assertions catch exceptions on Object models");

		var AssertArray = Model.Array(Number)
			.assert(function(v){ return v.length >= 0 }, "may throw exception");
		new AssertArray([]);
		assert.throws(function(){ new AssertArray(); },
			/assertion \"may throw exception\" returned TypeError.*for value undefined/,
			"assertions catch exceptions on Array models");

		var Address = new Model({
			city: String,
			country: String
		}).assert(function(a) {
			return a.country === "GB";
		}, "Country must be GB");

		var gbAddress = { city: "London", country: "GB" };
		var frAddress = { city: "Paris", country: "FR" };

		var Order = new Model({
			sku: String,
			address: Address
		});

		var gbOrder = { sku: "ABC123", address: gbAddress };
		var frOrder = { sku: "ABC123", address: frAddress };

		Order.validate(gbOrder); // no errors
		assert.throws(function(){ Order.validate(frOrder); }, "should validate sub-objects assertions");

	});

	QUnit.test("Cyclic detection", function(assert){

		var A, B, a, b;

		A = Model({ b: [] });
		B = Model({ a: A });
		A.definition.b = [B];

		a = A();
		b = B({ a: a });

		assert.ok(a.b = b, "valid cyclic value assignment");
		assert.throws(function(){a.b = a; }, /TypeError/, "invalid cyclic value assignment");

		A = Model({ b: [] });
		B = Model({ a: A });

		A.definition.b = {
			c: {
				d: [B]
			}
		};

		a = A();
		b = B({ a: a });

		assert.ok(a.b = { c: { d: b } }, "valid deep cyclic value assignment");
		assert.throws(function(){ a.b = { c: { d: a } }; }, /TypeError/, "invalid deep cyclic value assignment");

		var Honey = Model({
			sweetie: [] // Sweetie is not yet defined
		});

		var Sweetie = Model({
			honey: Honey
		});

		Honey.definition.sweetie = [Sweetie];

		var joe = Honey({ sweetie: undefined }); // ann is not yet defined
		var ann = Sweetie({ honey: joe });
		assert.ok(joe.sweetie = ann, "website example valid assignment");
		assert.throws(function(){ joe.sweetie = "dog" }, /TypeError/, "website example invalid assignment 1");
		assert.throws(function(){ joe.sweetie = joe }, /TypeError/, "website example invalid assignment 2");

	});

	QUnit.test("Custom error collectors", function(assert) {

		assert.expect( 24 );

		var defaultErrorCollector = Model.prototype.errorCollector;
		assert.equal(typeof defaultErrorCollector, "function", "Model has default errorCollector");

		Model.prototype.errorCollector = function(errors){
			assert.ok(errors.length === 1, "check errors.length global collector");
			var err = errors[0];
			assert.equal(err.expected, Number, "check error.expected global collector");
			assert.equal(err.received, "nope", "check error.received global collector");
			assert.equal(err.message, 'expecting Number, got String "nope"', "check error.message global collector");
		}

		Model(Number)("nope");

		Model.prototype.errorCollector = function(errors){
			assert.ok(errors.length === 1, 'global custom collector assertion error catch 1/2');
			assert.equal(errors[0].message,
				'assertion \"shouldnt be nope\" returned false for value \"nope\"',
				'global custom collector assertion error catch 2/2');
		}

		Model(String).assert(function(s){ return s !== "nope" }, "shouldnt be nope")("nope");

		var M = Model.Object({
			a: {
				b: {
					c: true
				}
			}
		});

		M.errorCollector = function(errors){
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

		Model(Number).validate("nope", function(errors){
			assert.ok(errors.length === 1, "check errors.length custom collector");
			var err = errors[0];
			assert.equal(err.expected, Number, "check error.expected custom collector");
			assert.equal(err.received, "nope", "check error.received custom collector");
			assert.equal(err.message, 'expecting Number, got String "nope"', "check error.message custom collector");
		});

		Model(String).assert(function(s){ return s !== "nope" }, "shouldnt be nope")
			.validate("nope", function(errors){
				assert.ok(errors.length === 1, 'local custom collector assertion error catch 1/2');
				assert.equal(errors[0].message,
					'assertion \"shouldnt be nope\" returned false for value \"nope\"',
					'local custom collector assertion error catch 2/2');
			});

		Model.Object({
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
		}, function(errors){
			assert.ok(errors.length === 1, "check nested errors.length custom collector");
			var err = errors[0];
			assert.deepEqual(err.expected, null, "check nested error.expected custom collector");
			assert.deepEqual(err.received, undefined, "check nested error.received custom collector");
			assert.equal(err.path, "d.e.f", "check nested error.path custom collector");
			assert.equal(err.message, 'expecting d.e.f to be null, got undefined', "check nested error.message custom collector");
		})

		M = Model({ x: Number });
		M.errorCollector = function noop(){ };
		assert.equal(M.test({ x: "nope" }), false, "Model.test should work even when errorCollector does not throw exceptions");

		Model.prototype.errorCollector = defaultErrorCollector;

	});

	QUnit.test("Automatic model casting", function (assert) {

		var User = new Model({username: String, email: String})
			.defaults({username: 'foo', email: 'foo@foo'});
		var Article = new Model({title: String, user: User})
			.defaults({title: 'bar', user: new User()});
		var a = new Article();
		a.user = {username: 'joe', email: 'foo'};

		assert.ok(a.user instanceof User, "automatic model casting when assigning a duck typed object");
		assert.ok(a.user.username === "joe", "preserved props after automatic model casting of duck typed object");

		User = new Model({username: String, email: String})
			.defaults({username: 'foo', email: 'foo@foo'});
		Article = new Model({title: String, user: [User]})
			.defaults({title: 'bar', user: new User()});
		a = new Article();
		a.user = {username: 'joe', email: 'foo'};

		assert.ok(a.user instanceof User, "automatic optional model casting when assigning a duck typed object");
		assert.ok(a.user.username === "joe", "preserved props after automatic optional model casting of duck typed object");

		var Type1 = Model({ name: String, other1: [Boolean] });
		var Type2 = Model({ name: String, other2: [Number] });
		var Container = Model({ foo: { bar: [Type1, Type2] }});


		consoleMock.apply();
		var c = new Container({ foo: { bar: { name: "dunno" }}});
		assert.ok(/Ambiguous model for[\s\S]*?name: "dunno"[\s\S]*?other1: \[Boolean\][\s\S]*?other2: \[Number\]/
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

		var N = Model({ x: Number, y: [Number] }).defaults({ x: 5, y: 7 });
		var Arr = Model.Array(N);
		a = Arr([ { x:9 } ]);
		assert.ok(a[0] instanceof N, "test automatic model casting with array init 1/2")
		assert.equal(a[0].x * a[0].y, 63, "test automatic model casting with array init 2/2")
		a.push({ x: 3 });
		assert.ok(a[1] instanceof N, "test automatic model casting with array mutator method 1/2")
		assert.equal(a[1].x * a[1].y, 21, "test automatic model casting with array mutator method 2/2")
		a[0] = { x: 10 };
		assert.ok(a[0] instanceof N, "test automatic model casting with array set index 1/2")
		assert.equal(a[0].x * a[0].y, 70, "test automatic model casting with array set index 2/2");

		var F = Model.Function(N, N).return(N);
		var f = F(function(a,b){ return { x: a.x+b.x, y: a.y+b.y } });
		var returnValue = f({ x: 1 }, { x: 2 });

		assert.ok(returnValue instanceof N, "test automatic model casting with return value");
		assert.equal(returnValue.x, 3, "test automatic casting with function args 1/2");
		assert.equal(returnValue.y, 14, "test automatic casting with function args 2/2");

	})

})(this.Model)