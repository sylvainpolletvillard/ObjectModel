
QUnit.test( "basic Object Model", function( assert ) {

  assert.ok(Object.Model instanceof Function);

  var Person = Object.Model({
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

  assert.strictEqual(joe.name, "Joe");
  assert.strictEqual(joe.age, 42);
  assert.strictEqual(joe.female, false);
  assert.equal(+joe.birth, +(new Date(1990,3,25)));
  assert.strictEqual(joe.address.work.city, "Lille");
  assert.ok(joe instanceof Person && joe instanceof Object);
  assert.ok(Person instanceof Object.Model && Person instanceof Function);

  joe.name = "Big Joe";
  joe.age++;
  joe.birth = new Date(1990,3,26);
  delete joe.female;

  assert.throws(function(){ joe.name = 42; }, /TypeError/);
  assert.throws(function(){ joe.age = true; }, /TypeError/);
  assert.throws(function(){ joe.birth = function(){}; }, /TypeError/);
  assert.throws(function(){ joe.female = "nope"; }, /TypeError/);
  assert.throws(function(){ joe.address.work.city = []; }, /TypeError/);
  assert.throws(function(){ joe.address.work = { city: 42 }; }, /TypeError/);
  assert.throws(function(){
    joe = Person({
      name: "Joe",
      age: 42,
      birth: new Date(1990,3,25),
      female: null
    });
  }, function(err){
    return /TypeError/.test(err.toString())
       && /female/.test(err.toString())
       && /null/.test(err.toString())
  });

});

QUnit.test("optional and multiple parameters", function(assert){
  var Person = Object.Model({
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
  assert.ok(joe instanceof Person);
  joe.name = "joe";
  joe.name = undefined;
  joe.age = new Date(1995,1,23);
  joe.age = undefined;
  joe.female = "ann";
  joe.female = 2;
  joe.female = false;
  assert.throws(function(){ joe.female = undefined; }, /TypeError/);
  joe.address.city = "Lille";
  joe.address.city = undefined;
  joe.haircolor = "blond";
  joe.haircolor = undefined;
  assert.throws(function(){ joe.name = false; }, /TypeError/);
  assert.throws(function(){ joe.age = null; }, /TypeError/);
  assert.throws(function(){ joe.age = []; }, /TypeError/);
  assert.throws(function(){ joe.address.work.city = 0; }, /TypeError/);
  assert.throws(function(){ joe.haircolor = ""; }, /TypeError/);
});

QUnit.test("fixed values", function(assert){
  var Model = Object.Model({
    a: [1,2,3],
    b: 42,
    c: ["",false,null,0],
    haircolor: ["blond","brown","black"],
    foo: "bar",
    x: [Number, true]
  });

  var model = Model({
    a:1,
    b:42,
    c: 0,
    haircolor: "blond",
    foo: "bar",
    x: true
  });

  model.x = 666;
  model.haircolor="brown";

  assert.throws(function(){ model.a = 4; }, /TypeError/);
  assert.throws(function(){ model.b = 43; }, /TypeError/);
  assert.throws(function(){ model.c = undefined; }, /TypeError/);
  assert.throws(function(){ model.haircolor = "roux"; }, /TypeError/);
  assert.throws(function(){ model.foo = "baz"; }, /TypeError/);
  assert.throws(function(){ model.x = false; }, /TypeError/);

});

QUnit.test("Array models", function(assert){

  assert.equal(typeof Array.Model, "function");
  var Arr= Array.Model(Number);
  var a, b, c, d;

  assert.ok(Arr instanceof Array.Model && Arr instanceof Function);
  a = Arr();
  assert.ok(a instanceof Arr && a instanceof Array);

  a.push(1);
  a[0] = 42;
  a.splice(1,0,5,6,Infinity);
  assert.throws(function(){a.push("toto"); }, /TypeError/, "push");
  assert.throws(function(){ a[0] = {}; }, /TypeError/, "set index");
  assert.throws(function(){a.splice(1,0,7,'oups',9); }, /TypeError/, "splice");
  assert.equal(a.length, 4);

  b = Arr(1,2,3);
  assert.equal(b.length, 3);

  assert.throws(function(){
    c = Arr(1,false,3);
  }, /TypeError/);

  assert.throws(function(){
    d = Arr(1,2,3,function(){});
  }, /TypeError/);


  var Question = Object.Model({
    answer: Number
  });


  Arr = Array.Model([Question,String,Boolean]);
  a = Arr("test");
  a.unshift(true);
  a.push(Question({ answer: 42 }));
  //a.push({ answer: 43 });
  assert.throws(function(){a.unshift(42); }, /TypeError/, "unshift multiple types");
  assert.throws(function(){a[0] = null; }, /TypeError/, "set index multiple types");

  Arr = Array.Model([true,2,"3"]);
  assert.throws(function(){ a = Arr("3",2,true,1); }, /TypeError.*Array\[3]/, "arrayModel fixed values");

  var Cards = Array.Model([Number, "J","Q","K"]); // array of Numbers, J, Q or K
  var Hand = Cards.extend().min(2).max(2);
  var pokerHand = new Hand("K",10);

  assert.ok(pokerHand instanceof Hand && pokerHand instanceof Cards, "array model inheritance");
  Cards("K",10).push(7);
  assert.throws(function(){ Hand("K",10).push(7); }, /TypeError/, "min/max of inherit array model");

  var CheaterHand = Hand.extend("joker");
  CheaterHand("K",10,"joker");
  assert.throws(function(){ Hand("K",10, "joker"); }, /TypeError/, "array model type extension");


});

QUnit.test("Function models", function(assert){

  assert.equal(typeof Function.Model, "function");

  var op = new Function.Model(Number, Number).return(Number);

  assert.ok(op instanceof Function.Model && op instanceof Function);

  var add = op(function(a,b){ return a + b; });
  var add3 = op(function(a,b,c){ return a + b + c; });
  var noop = op(function(a, b){ return undefined; });
  var addStr = op(function(a,b){ return String(a) + String(b); });

  assert.ok(add instanceof Function && add instanceof op);

  assert.equal(add(15,25),40);
  assert.throws(function(){ add(15) }, /TypeError/, "too few arguments");
  assert.throws(function(){ add3(15,25,42) }, /TypeError/, "too much arguments");
  assert.throws(function(){ noop(15,25) }, /TypeError/, "no return");
  assert.throws(function(){ addStr(15,25) }, /TypeError/, "incorrect return type");

  var Person = Object.Model({
    name: String,
    age: Number,
    // function without arguments returning a String
    sayMyName: Function.Model().return(String)
  }).defaults({
    sayMyName: function(){
      return "my name is " + this.name;
    }
  });

  /* To use a model in the argument validation of one
   of its own methods, we have to separate the
   declarations of the model and method. */

// takes one argument of type Person, returns a String
  var greetFnModel = Function.Model(Person).return(String);
  Person.prototype.greet = greetFnModel(function(otherguy){
    return "Hello "+ otherguy.name + ", " + this.sayMyName();
  });

  var joe = new Person({ name: "Joe", age: 28 });
  var ann = new Person({ name: "Ann", age: 23 });


  assert.equal(joe.sayMyName(), "my name is Joe");
  assert.equal(joe.greet(ann), "Hello Ann, my name is Joe");

  assert.throws(function(){ joe.greet("dog"); }, /TypeError/, "invalid argument type");

  var Calculator = Function.Model(Number, ["+","-","*","/"], Number)
     .defaults(0,"+",1)
     .return(Number);

  var calc = new Calculator(function(a,operator,b){
    return eval(a+operator+b);
  });

  assert.equal(calc(3,"+"), 4, "default argument value");
  assert.equal(calc(41), 42, "defaults arguments values");
  assert.throws(function(){ calc(6,"*",null); }, /TypeError/, "invalid argument type");


});

QUnit.test("Default values", function(assert){

  var Model = new Object.Model({
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
  var model = Model();
  assert.strictEqual(model.name,"joe");
  assert.strictEqual(model.foo.bar.buz, 0);

  var model2 = Model({ name: "jim", foo:{ bar: { buz: 1 }}});
  assert.strictEqual(model2.name,"jim");
  assert.strictEqual(model2.foo.bar.buz, 1);

  var op = new Function.Model(Number, Number).return(Number).defaults(11,31);
  var add = op(function(a,b){ return a + b; });
  assert.equal(add(), 42);

});

QUnit.test("RegExp values", function(assert){

  var Model = Object.Model({
    phonenumber: /^[0-9]{10}$/,
    voyels: [/^[aeiouy]+$/]
  });

  var m = Model({
    phonenumber: "0612345678"
  });

  m.voyels = "ouioui";
  assert.throws(function(){m.voyels = "nonnon" }, /TypeError/, "regex matching");
  assert.throws(function(){m.phonenumber = "123456789" }, /TypeError/, "regex matching 2");

});

QUnit.test("Non-enumerable and non-writable properties", function(assert){

  var Model = Object.Model({
    CONST: Number,
    _private: Number,
    normal: Number
  });

  var m = Model({
    CONST: 42,
    _private: 43,
    normal: 44
  });

  m.normal++;
  m._private++;
  assert.throws(function(){ m.CONST++; }, /TypeError.*constant/, "try to redefine constant");
  assert.equal(Object.keys(m).length, 2, "non enumerable key not counted by Object.keys");
  assert.equal(Object.keys(m).indexOf("_private"), -1, "non enumerable key not found in Object.keys");

});

QUnit.test("Extensions", function(assert){

  var Person = Object.Model({
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

  assert.equal(Person.isValidModelFor(joe), true, "Person valid model for joe");
  assert.equal(Woman.isValidModelFor(joe), false, "Woman invalid model for joe");

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
  }, /TypeError.*female/, "cant be woman from joe parameters");

  assert.throws(function(){
    var _joe = Woman(joe);
  }, /TypeError.*female/, "cant be woman from Person joe");

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

  assert.equal(Woman.isValidModelFor(ann), true, "Woman valid model for ann");
  assert.equal(UnemployedWoman.isValidModelFor(ann), false, "UnemployedWoman invalid model for ann");

  assert.throws(function(){
    var _ann = UnemployedWoman(ann);
  }, /TypeError.*city/, "ann cant be UnemployedWoman;  model extension nested undefined property");


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

});

QUnit.test("Composition", function(assert){


var Person = Object.Model({
  name: String,
  age: [Number, Date],
  female: [Boolean],
  address: {
    work: {
      city: [String]
    }
  }
});

var Family = Object.Model({
  father: Person,
  mother: Person.extend({ female: true }),
  children: Array.Model(Person),
  grandparents: [Array.Model(Person).max(4)]
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

  var joefamily = new Family({
    father: joe,
    mother: {
      female: true,
      age: joe.age - 5,
      name: joe.name+"'s wife"
    },
    children: []
  });

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
  }, /TypeError.*mother*/, "validation of submodel");

});
