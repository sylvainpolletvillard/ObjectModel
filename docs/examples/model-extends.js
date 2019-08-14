import { ObjectModel } from "objectmodel";

const Person = ObjectModel({
  name: String,
  female: Boolean
});

const Mother = Person.extend({
  female: true,
  child: Person
});

let joe = new Person({ name: "Joe", female: false });
let ann = new Person({ name: "Ann", female: true });
let joanna = new Person({ name: "Joanna", female: true });

ann = new Mother({ name: "Ann", female: true, child: joanna });
console.log(ann instanceof Mother && ann instanceof Person); // true

joe = Mother(joe); // try to cast joe to Mother model
/*
TypeError: expecting female to be true, got Boolean false
expecting child to be {
    name: String,
        female: Boolean
}, got undefined
*/

console.log(ann, joe);
