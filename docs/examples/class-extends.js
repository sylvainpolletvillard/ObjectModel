import { ObjectModel } from "objectmodel";

class Person extends ObjectModel({ name: String, female: Boolean }) {
	constructor({ name, female }) {
		if (!female) name = `Mr ${name}`;
		super({ name, female });
	}
}

class Mother extends Person.extend({ female: true, child: Person }) {
	constructor({ name, female = true, child }) {
		super({ name: `Mama ${name}`, female, child });
	}
}

let joe = new Person({ name: "Joe", female: false });
let joanna = new Person({ name: "Joanna", female: true });
let ann = new Mother({ name: "Ann", child: joanna });

console.log(joe.name); // Mr Joe
console.log(ann.name); // Mrs Ann
console.log(ann.child.name); // Joanna

ann.child.name = null;
