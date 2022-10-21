import {expectType} from 'tsd';
import { Model, BasicModel, ObjectModel } from "../src/object-model"
import { FromDefinition } from '../types/definitions';

expectType<number>(BasicModel(Number)(0))
expectType<number>(Model(Number)(Infinity))

expectType<string>(BasicModel(String)(""))
expectType<string>(Model(String)("test"))

expectType<boolean>(BasicModel(Boolean)(true))
expectType<boolean>(Model(Boolean)(false))

expectType<string>(BasicModel(/A-Z/)("TEST"))

type T = FromDefinition<["optional"]>
const M = Model(["optional"])

expectType<"optional" | undefined | null>(BasicModel(["optional"])())
expectType<Number | undefined | null>(BasicModel([Number])(null))

expectType<"one" | "two">(BasicModel(["one","two"])("one"))
expectType<Number | String>(BasicModel([Number, String])(2))
expectType<Boolean | null>(BasicModel([Boolean, null])(false))
expectType<Date | "never">(BasicModel(["never", Date])("never"))

expectType<{ a: number, b: "b" }>(Model({ a: Number, b: "b" }))

expectType<{
    product: {
        name: string,
        quantity: number
    },
    orderDate: Date
}>(ObjectModel({
	product: {
		name: String,
		quantity: Number,
	},
	orderDate: Date
}))