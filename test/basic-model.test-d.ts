import {expectError, expectType} from 'tsd';
import { Model, BasicModel } from "../src/object-model"

expectType<number>(BasicModel(Number)(0))
expectType<number>(new Model(Number)(Infinity))
expectError(BasicModel(Number)("0"))

expectType<string>(new BasicModel(String)(""))
expectType<string>(Model(String)("test"))
expectError(Model(String)(null))

expectType<boolean>(BasicModel(Boolean)(true))
expectType<boolean>(new Model(Boolean)(false))
expectError(new Model(Boolean)(""))

expectType<string>(BasicModel(/A-Z/)("TEST"))

expectType<"optional" | undefined | null>(BasicModel(<const>["optional"])(undefined))
expectType<number | undefined | null>(new BasicModel(<const>[Number])(null))
expectType<string | undefined| null>(new BasicModel(<const>[String])(null))

expectType<"one" | "two">(BasicModel(<const>["one","two"])("one"))
expectType<number | string>(BasicModel(<const>[Number, String])(2))
expectType<boolean | null>(new BasicModel(<const>[Boolean, null])(false))
expectType<Date | "never">(new BasicModel(<const>["never", Date])("never"))

const M = new BasicModel(Date)
const M2 = M.extend()
expectType<Date>(M2(new Date()))
const M3 = M2.extend(String)
expectType<Date | string>(M3(new Date()))

const N = BasicModel(Number).defaultTo(0)
expectType<0>(N())
expectError(N("not a number"))