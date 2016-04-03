function bench(descriptions, tests, n){
	var t1 = Date.now();
	console.time("total");
	(function tryhard(t){
		var t0 = Date.now();
		console.time("bench "+t);
		for(var i = n || 1000; i; i--) tests[t]();
		console.timeEnd("bench "+t);
		document.querySelector("#results").innerHTML+="<dt>"+descriptions[t]+"</dt><dd>"+(Date.now()-t0)+"ms<dd/>";
		setTimeout(function(){
			if(++t === tests.length){
				console.timeEnd("total");
				document.querySelector("#results").innerHTML+="<dt>Total</dt><dd>"+(Date.now()-t1)+"ms<dd/>";
				return;
			}
			tryhard(t);
		}, 500);
	})(0);
}

var tests = {

	"Basic models": function b1(){
		var NumberModel = Model(Number);
		NumberModel(42);
		try { NumberModel("12"); } catch (e){}
		var OptionalNumberModel = NumberModel.extend(undefined);
		try { NumberModel(); } catch (e){}
		OptionalNumberModel();
	},

	"Multiple types": function b2(){
		var myModel = Model([String, Boolean, Date]);
		myModel("test");
		myModel(true);
		myModel(new Date());
		try { myModel();  } catch (e){}
		try { myModel(0); } catch (e){}
	},

	"Object models": function b3(){
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

		joe.name = "Big Joe";
		joe.age++;
		joe.birth = new Date(1990,3,26);
		delete joe.female;
		try { joe.address.work = { city: 42 }; } catch (e){}
		
	},

	"Object model with multiple types": function b4(){

		var Person = Model({
			name: [String],
			age: [Number, Date, String, Boolean, undefined],
			female: [Boolean, Number, String],
			haircolor: ["blond","brown","black", undefined],
			address: {
				work: {
					city: [String]
				}
			}
		});

		var joe = Person({ female: false });
		joe.name = "joe";
		joe.name = undefined;
		joe.age = new Date(1995,1,23);
		joe.age = undefined;
		joe.female = "ann";
		joe.female = 2;
		joe.female = false;
		try { joe.female = undefined; } catch (e){}
		joe.address.work.city = "Lille";
		joe.address.work.city = undefined;
		joe.haircolor = "blond";
		joe.haircolor = undefined;
		try { joe.address.work.city = 0; } catch (e){}
	},

	"Array models": function b5() {

		var Arr = Model.Array(Number);
		var a, b, c, d;
		
		a = Arr();

		a.push(1);
		a[0] = 42;
		a.splice(1, 0, 5, 6, Infinity);
		try { a.push("toto"); } catch (e){}
		try { a[0] = {}; } catch (e){}
		try { a.splice(1, 0, 7, 'oups', 9); } catch (e){}
		b = a.length;

		b = Arr(1, 2, 3);
		try { c = Arr(1, false, 3); } catch (e){}
		try { d = Arr(1, 2, 3, function () { }); } catch (e){}
	},

	"Array models with multiple types": function b6() {
		var Question = Model({
			answer: Number
		});

		var Arr = Model.Array([Question, String, Boolean]);
		var a = Arr("test");
		a.unshift(true);
		a.push(Question({answer: 42}));
		a.push({answer: 43});
		try { a.unshift(42); } catch (e){}
		try { a[0] = null; } catch (e){}

	},

	"Array models inheritance": function b7(){

		var Cards = Model.Array([Number, "J","Q","K"]); // array of Numbers, J, Q or K
		var Hand = Cards.extend().assert(function(cards){
			return cards.length === 2;
		});
		var pokerHand = new Hand("K",10);
		
		Cards("K",10).push(7);
		try { Hand("K",10).push(7); } catch (e){}

		var CheaterHand = Cards.extend("joker");
		CheaterHand("K",10,"joker");
		try { Hand("K",10, "joker"); } catch (e){}

	},

	"Function models": function b8() {

		var op = Model.Function(Number, Number).return(Number);

		var add = op(function (a, b) {
			return a + b;
		});
		var add3 = op(function (a, b, c) {
			return a + b + c;
		});
		var noop = op(function () {
			return undefined;
		});
		var addStr = op(function (a, b) {
			return String(a) + String(b);
		});
		
		add(15, 25);
		try { add(15); } catch (e){}
		try { add3(15, 25, 42); } catch (e){}
		try { noop(15, 25); } catch (e){}
		try { addStr(15, 25); } catch (e){}

	},

	"Object models with function models": function b9() {

		var Person = Model({
			name: String,
			age: Number,
			// function without arguments returning a String
			sayMyName: Model.Function().return(String)
		}).defaults({
			sayMyName: function () {
				return "my name is " + this.name;
			}
		});

		var greetFnModel = Model.Function(Person).return(String);
		Person.prototype.greet = greetFnModel(function (otherguy) {
			return "Hello " + otherguy.name + ", " + this.sayMyName();
		});

		var joe = new Person({name: "Joe", age: 28});
		var ann = new Person({name: "Ann", age: 23});

		joe.sayMyName();
		joe.greet(ann);
	},

	"Function model with defaults and return value": function b10() {

		var Calculator = Model.Function(Number, ["+", "-", "*", "/"], Number)
			.defaults(0, "+", 1)
			.return(Number);

		var calc = new Calculator(function (a, operator, b) {
			return eval(a + operator + b);
		});

		calc(3, "+");
		calc(41);
		try { calc(6, "*", null); } catch (e){}

	},

	"Models with RegExp": function b11(){

		var myModel = Model({
			phonenumber: /^[0-9]{10}$/,
			voyels: [/^[aeiouy]+$/]
		});

		var m = myModel({
			phonenumber: "0612345678"
		});

		m.voyels = "ouioui";
		try { m.voyels = "nonnon"; } catch (e){}
		try { m.phonenumber = "123456789" ; } catch (e){}

	},

	"Models with private and constants": function b12(){

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
		try { m.CONST++; } catch (e){}
		Object.keys(m).indexOf("_private");

	},

	"Object models inheritance" : function b13(){

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
		Person(joe);
		try { Woman(joe); } catch (e){}

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

		Woman(ann);
		try { UnemployedWoman(ann); } catch (e){}

		var jane = UnemployedWoman({
			name: "Jane",
			age: 52,
			birth: new Date(1990,3,25),
			female: true
		});

	},

	"Models composition": function b14(){

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
			grandparents: [Model.Array(Person).assert(function(persons){ return persons.length <= 4 })]
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
		
		var joefamily = new Family({
			father: joe,
			mother: {
				female: true,
				age: joe.age - 5,
				name: joe.name+"'s wife"
			},
			children: []
		});

		try {
			joefamily = new Family({
				father: joe,
				mother: {
					female: false,
					age: joe.age - 5,
					name: joe.name+"'s wife"
				},
				children: []
			});
		} catch (e){}

	},

	"Assertions": function b15(){

		function isOdd(n){ return n%2 === 1; }
		var OddNumber = Model(Number).assert(isOdd);
		OddNumber(17);
		try { OddNumber(18); } catch (e){}

		var RealNumber = Model(Number).assert(isFinite);

		RealNumber(Math.sqrt(1));
		try { RealNumber(Math.sqrt(-1)) } catch (e){}

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
		try { PrimeNumber(87); } catch (e){}
		try { PrimeNumber(7.77); } catch (e){}

		var ArrayMax3 = Model.Array(Number).assert(function maxRange(arr){ return arr.length <= 3; });
		var arr = ArrayMax3(1,2);
		arr.push(3);
		try { arr.push(4); } catch (e){}

		var ArraySumMax10 = Model.Array(Number).assert(function(arr){
			return arr.reduce(function(a,b){ return a+b; },0) <= 10;
		});

		arr = ArraySumMax10(2,3,4);
		try { arr[1] = 7; } catch (e){}

		var NestedModel = Model.Object({ foo: { bar: { baz: Boolean }}}).assert(function(o){
			return o.foo.bar.baz === true;
		});
		var nestedModel = NestedModel({ foo: { bar: { baz: true }}});
		try { nestedModel.foo.bar.baz = false; } catch (e){}

	},

	"Models with circular references": function b16(){

		var A, B, a, b;

		A = Model({ b: [] });
		B = Model({ a: A });
		A.definition.b = [B];

		a = A();
		b = B({ a: a });

		a.b = b;
		try { a.b = a; } catch (e){}

		A = Model({ b: [] });
		B = Model({ a: A });

		A.definition.b = {
			c: {
				d: [B]
			}
		};

		a = A();
		b = B({ a: a });

		a.b = { c: { d: b } };
		try { a.b = { c: { d: a } }; } catch (e){}

		var Honey = Model({
			sweetie: [] // Sweetie is not yet defined
		});

		var Sweetie = Model({
			honey: Honey
		});

		Honey.definition.sweetie = [Sweetie];

		var joe = Honey({ sweetie: undefined }); // ann is not yet defined
		var ann = Sweetie({ honey: joe });
		joe.sweetie = ann;
		try { joe.sweetie = "dog"; } catch (e){}
		try { joe.sweetie = joe; } catch (e){}

	}

};

var descriptions = Object.keys(tests);
var tests = descriptions.map(function(t){ return tests[t]; });
bench(descriptions, tests);











