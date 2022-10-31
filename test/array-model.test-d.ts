import {expectType} from 'tsd';
import { ArrayModel } from '../src/array-model';
import { Model, BasicModel, ObjectModel } from "../src/object-model"

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

const ModelA = Model({ a: Number, c: Number })
const ModelB = Model({ b: String, c: String })
const AorBs = ArrayModel([ModelA, ModelB])
const aorbs = AorBs([ { a: 1, c:0 }, { b: "2", c: ""}])
expectType<({ a: number, c: number } | { b: string, c: string })[]>(aorbs)