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
/*
const Person = ObjectModel({ name: String, female: Boolean })
const Father = Person.extend({ female: false, child: Person })
const Mother = Person.extend({ female: true, child: Person })

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
*/