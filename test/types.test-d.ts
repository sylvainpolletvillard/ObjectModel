import {expectType} from 'tsd';
import { Model, BasicModel, ObjectModel } from "../src/object-model"

expectType<number>(BasicModel(Number)(0))
expectType<number>(Model(Number)(Infinity))

expectType<string>(BasicModel(String)(""))
expectType<string>(Model(String)("test"))

expectType<boolean>(BasicModel(Boolean)(true))
expectType<boolean>(Model(Boolean)(false))

expectType<string>(BasicModel(/A-Z/)("TEST"))

expectType<"optional" | undefined | null>(BasicModel(<const>["optional"])())
expectType<number | undefined | null>(BasicModel(<const>[Number])(null))

expectType<"one" | "two">(BasicModel(<const>["one","two"])("one"))
expectType<number | string>(BasicModel(<const>[Number, String])(2))
expectType<boolean | null>(BasicModel(<const>[Boolean, null])(false))
expectType<Date | "never">(BasicModel(<const>["never", Date])("never"))

expectType<{ a: number, b: "b" }>(Model({ a: Number, b: <const>"b" })({ a: 1, b: "b" }))

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
})({
    product: { name: "Apple Pie", quantity: 1 },
	orderDate: new Date()
}))