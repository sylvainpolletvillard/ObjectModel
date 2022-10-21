import {expectType} from 'tsd';
import { Model, BasicModel } from "../src/object-model"

expectType<number>(BasicModel(Number)(0))
expectType<number>(new Model(Number)(Infinity))

expectType<string>(new BasicModel(String)(""))
expectType<string>(Model(String)("test"))

expectType<boolean>(BasicModel(Boolean)(true))
expectType<boolean>(new Model(Boolean)(false))

expectType<string>(BasicModel(/A-Z/)("TEST"))

expectType<"optional" | undefined | null>(BasicModel(<const>["optional"])())
expectType<number | undefined | null>(new BasicModel(<const>[Number])(null))

expectType<"one" | "two">(BasicModel(<const>["one","two"])("one"))
expectType<number | string>(BasicModel(<const>[Number, String])(2))
expectType<boolean | null>(new BasicModel(<const>[Boolean, null])(false))
expectType<Date | "never">(new BasicModel(<const>["never", Date])("never"))