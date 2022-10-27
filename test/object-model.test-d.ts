import {expectType} from 'tsd';
import { Model, ObjectModel } from "../src/object-model"
import { FromDefinition } from '../types/definitions';

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


class Person extends ObjectModel({ name: String, female: Boolean }){
	constructor({ name, female }: { name: string, female: boolean }){
		if(!female) name = `Mr ${name}`
		super({ name, female })
	}
}



class Mother extends Person.extend({ female: true, child: Person }){
	constructor({ name, child }: { name: string, child: Person }){
		super({ name: `Mrs ${name}`, female: true })
        this.child = child
	}
}

const joanna = new Person({ name: "Joanna", female: true })
const ann = new Mother({ name: "Ann", child: joanna })

const MotherModelExtend = Person.extend({ female: true, child: Person })
const M = MotherModelExtend({ female: true, child: ann, name: "M" })
M.child


expectType<Mother>(ann)
expectType<string>(ann.name)
expectType<Person>(ann.child)