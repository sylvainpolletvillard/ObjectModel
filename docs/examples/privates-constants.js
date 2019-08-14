import { Model, ObjectModel } from "objectmodel";

const Circle = ObjectModel({
  radius: Number, // public
  _index: Number, // private
  UNIT: ["px", "cm"], // constant
  _ID: [Number] // private and constant
}).defaultTo({
  _index: 0,
  getIndex() {
    return this._index;
  },
  setIndex(value) {
    this._index = value;
  }
});

let c = new Circle({ radius: 120, UNIT: "px", _ID: 1 });
c.radius = 100;
c.UNIT = "cm";
// TypeError: cannot modify constant property UNIT

c._index = 1;
// TypeError: cannot modify private property _index
console.log(c._index);
// TypeError: cannot access to private property _index
c.setIndex(2);
console.log(c.getIndex());
// 2

console.log(Object.keys(c)); // private variables are not enumerated
// ["radius", "UNIT"]

// change the private convention for all models
Model.prototype.conventionForPrivate = key => key.startsWith("#");

// remove the constant convention specifically for Circle
Circle.conventionForConstant = () => false;

// Private and constant conventions have been changed
c._index = 3;
c.UNIT = "cm";

console.log(c._index, c.UNIT); // no more errors
// 3 "cm"
