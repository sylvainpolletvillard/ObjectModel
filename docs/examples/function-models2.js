import { ObjectModel, FunctionModel } from "objectmodel";

const Person = ObjectModel({
	name: String,
	// function without arguments returning a String
	sayMyName: FunctionModel().return(String)
}).defaultTo({
	sayMyName: function() {
		return "my name is " + this.name;
	}
});

// takes one Person as argument, returns a String
Person.prototype.greet = FunctionModel(Person).return(String)(function(
	otherguy
) {
	return "Hello " + otherguy.name + ", " + this.sayMyName();
});

const joe = new Person({ name: "Joe" });

document.write(joe.sayMyName());
// my name is Joe

document.write(joe.greet({ name: "Ann", greet: "hi ?" }));
// Hello Ann, my name is Joe

document.write(joe.greet({ name: "dog", sayMyName: "woof !" }));
// TypeError: expecting arguments[0].sayMyName to be "Function", got String "woof !"
