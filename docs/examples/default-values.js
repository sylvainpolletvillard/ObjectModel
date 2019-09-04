import { ObjectModel, BasicModel } from "objectmodel";

let N = BasicModel(Number).defaultTo(1);

console.log(N(5) + N());

const FileInfo = ObjectModel({
	name: String,
	size: [Number],
	creationDate: [Date],
	writable: Boolean
}).defaultTo({
	name: "Untitled file",
	size: 0,
	writable: true
});

let file = new FileInfo({ writable: false });
console.log(file.name); // name is mandatory but a default value was passed
// "Untitled file"

console.log(file.size); // size is optional, but the default value still applies
// 0

console.log(file.creationDate); // no default value was passed for this property
// undefined

console.log(file.writable); // passed value overrides default value
// false

console.log(Object.keys(file));
// ["name", "size", "creationDate", "writable"]

document.write(JSON.stringify(file));
