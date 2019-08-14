import { ObjectModel } from "objectmodel";

const Person = ObjectModel({
  name: String,
  age: [Number]
});

const Lovers = ObjectModel({
  husband: Person,
  wife: Person
});

const joe = { name: "Joe", age: 42 };
const ann = new Person({
  name: joe.name + "'s wife",
  age: joe.age - 5
});

const couple = Lovers({
  husband: joe, // object autocasted
  wife: ann // object model
});

console.log(couple.husband instanceof Person);
// true : has been casted to Person

couple.husband.age = "old";
