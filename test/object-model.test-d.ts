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