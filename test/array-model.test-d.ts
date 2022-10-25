import {expectType} from 'tsd';
import { ArrayModel } from '../src/array-model';
import { BasicModel, ObjectModel } from "../src/object-model"

expectType<number[]>(ArrayModel(Number)([1,2,3]))

const Cards = new ArrayModel([Number, "J" as const,"Q" as const,"K" as const]);
expectType<(number | "J" | "Q" | "K")[]>(Cards([]))

const Integer = BasicModel(Number).assert(Number.isInteger)
const Size = BasicModel(/^X{0,2}[SL]$/)
const Sizes = ArrayModel([Integer, Size])
const sizes = Sizes([12,"L"])
expectType<(string | number)[]>(sizes)


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

class Father extends Person.extend({ female: false, child: Person }){
    constructor({ name, child }: { name: string, child: Person }){
		super({ name: `Mr ${name}`, female: false })
        this.child = child
	}
}

const joanna = new Person({ name: "Joanna", female: true })
const joe = new Father({ name: "Joe", child: joanna })
const ann = new Mother({ name: "Ann", child: joanna })

const Group = ArrayModel(Person)
expectType<typeof Person[]>(Group([]))

const Parents = ArrayModel(<const>[Mother, Father])
const parents = Parents([joe, ann])
expectType<(typeof Father | typeof Mother)[]>(parents)

const Family = ObjectModel({	
	children: ArrayModel(Person), // array of Persons
	parents: ArrayModel(<const>[Mother, Father]) // array of Mothers or Fathers
});
const family = new Family({ parents: [joe, ann], children: [joanna] })

expectType<(typeof Person)[]>(family.children)
expectType<(typeof Father | typeof Mother)[]>(family.parents)
