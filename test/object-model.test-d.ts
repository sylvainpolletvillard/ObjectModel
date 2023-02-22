import {expectType} from 'tsd';
import { Model, ObjectModel } from "../src/object-model"

expectType<{ a: number, b: "b" }>(Model({ a: Number, b: <const>"b" })({ a: 1, b: "b" }))

expectType<{
    product: {
        name: string,
        quantity: number
    },
    orderDate: Date
}>(new ObjectModel({
	product: {
		name: String,
		quantity: Number,
	},
	orderDate: Date
})({
    product: { name: "Apple Pie", quantity: 1 },
	orderDate: new Date()
}))

const Person = ObjectModel({ name: String, female: Boolean })
const Man = Person.extend({ female: false })
const Mother = Person.extend({ female: true, child: Person })

let joanna = new Person({ name: "Joanna", female: true })
let joe = new Man({ name: "Joe" })
let ann = new Mother({ name: "Ann", child: joanna })
expectType<{ name: string, female: boolean }>(joanna)
expectType<{ name: string, female: boolean }>(joe)
expectType<{ name: string, female: boolean }>(ann.child)

class ClassPerson extends ObjectModel({ name: String, female: Boolean }){
	constructor({ name, female }: { name: string, female: boolean }){
		if(!female) name = `Mr ${name}`
		super({ name, female })
	}
}

class ClassMother extends ClassPerson.extend({ female: true, child: ClassPerson }){
	constructor({ name, child }: { name: string, child: ClassPerson }){
		super({ name: `Mrs ${name}`, female: true })
        this.child = child
	}
}

joanna = new ClassPerson({ name: "Joanna", female: true })
ann = new ClassMother({ name: "Ann", child: joanna })

expectType<ClassMother>(ann)
expectType<string>(ann.name)
expectType<ClassPerson>(ann.child)

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

expectType<{
	name: string,
	size: number,
	writable: boolean,
	creationDate: Date
}>(new FileInfo())

expectType<{
	name: string,
	size: number,
	writable: boolean,
	creationDate: Date
}>(new FileInfo({
	name: "My file",
	size: 100,
	writable: false,
	creationDate: new Date()
}))

class ClassWithDefault extends ClassPerson.defaultTo({ name: "Anonymous" }) {}

expectType<ClassWithDefault>(new ClassWithDefault())