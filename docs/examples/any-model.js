import { Any, ObjectModel, ArrayModel, FunctionModel } from "objectmodel";

// examples using the Any Model
const DataWrapper = ObjectModel({ data: Any });
const ArrayNotEmpty = ArrayModel(Any).assert(arr => arr.length > 0);
const Serializer = FunctionModel(Any).return(String);

// takes 2 parameters or more
const Operation = FunctionModel(Number, Number, ...Any);

// takes any amount of Numbers as parameters
const NumericOperation = FunctionModel(...Any(Number)).return(Number);

let sum = NumericOperation((...terms) => terms.reduce((a, b) => a + b, 0));

console.log(sum(1, 2, 3));
console.log(sum(1, 2, 3, "4"));
