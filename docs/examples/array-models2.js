import { ArrayModel, ObjectModel } from "objectmodel";

const Person = ObjectModel({
	name: String,
	female: Boolean
});

const Mother = Person.extend({
	female: true,
	child: Person
});

const Father = Person.extend({
	female: false,
	child: Person
});

const Family = ObjectModel({
	father: Father,
	mother: Mother,
	children: ArrayModel(Person), // array of Persons
	grandparents: [ArrayModel([Mother, Father])]
	// optional array of Mothers or Fathers
});

let joe = new Person({ name: "Joe", female: false });
let ann = new Person({ name: "Ann", female: true });
let joanna = new Person({ name: "Joanna", female: true });

const joefamily = new Family({
	father: joe,
	mother: ann,
	children: [joanna, "dog"]
});
// TypeError: expecting Array[1] to be { name: String, female: Boolean }, got String "dog"

console.log(joefamily);
