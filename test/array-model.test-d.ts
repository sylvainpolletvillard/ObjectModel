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

const Person = ObjectModel({ name: String, female: Boolean })
const Group = ArrayModel(Person)
expectType<{ name: string, female: boolean}[]>(Group([]))