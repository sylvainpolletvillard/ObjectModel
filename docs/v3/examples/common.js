// Examples of commonly used models
import { BasicModel } from "objectmodel"

export const Primitive = BasicModel([Boolean, Number, String, Symbol]).as("Primitive");

// Booleans-like
export const Falsy = BasicModel([Primitive, null, undefined]).assert(function isFalsy(x) { return !x }).as("Falsy");
export const Truthy = BasicModel([Primitive, Object]).assert(function isTruthy(x) { return !!x }).as("Truthy");

// Numbers
export const Integer = BasicModel(Number).assert(Number.isInteger).as("Integer");
export const SafeInteger = BasicModel(Number).assert(Number.isSafeInteger).as("SafeInteger");
export const FiniteNumber = BasicModel(Number).assert(Number.isFinite).as("FiniteNumber");
export const PositiveNumber = BasicModel(Number).assert(function isPositive(n) { return n >= 0 }).as("PositiveNumber");
export const NegativeNumber = BasicModel(Number).assert(function isNegative(n) { return n <= 0 }).as("NegativeNumber");
export const PositiveInteger = PositiveNumber.extend().assert(Number.isInteger).as("PositiveInteger");
export const NegativeInteger = NegativeNumber.extend().assert(Number.isInteger).as("NegativeInteger");

// Strings
export const StringNotBlank = BasicModel(String).assert(function isNotBlank(str) { return str.trim().length > 0 }).as("StringNotBlank");
export const NormalizedString = BasicModel(String).assert(function isNormalized(str) { return str.normalize() === str }).as("NormalizedString");
export const TrimmedString = BasicModel(String).assert(function isTrimmed(str) { return str.trim() === str }).as("TrimmedString");

// Dates
export const PastDate = BasicModel(Date).assert(function isInThePast(date) { return date.getTime() < Date.now() }).as("PastDate");
export const FutureDate = BasicModel(Date).assert(function isInTheFuture(date) { return date.getTime() > Date.now() }).as("FutureDate");

// Arrays
export const ArrayNotEmpty = BasicModel(Array).assert(function isNotEmpty(arr) { return arr.length > 0 }).as("ArrayNotEmpty");
export const ArrayUnique = BasicModel(Array).assert(function hasNoDuplicates(arr) { return arr.every((x, i) => arr.indexOf(x) === i) }).as("ArrayUnique");
export const ArrayDense = BasicModel(Array).assert(function hasNoHoles(arr) { return arr.filter(() => true).length === arr.length }).as("ArrayDense");

// Others
export const PromiseOf = model => p => BasicModel(Promise)(p).then(x => model(x));