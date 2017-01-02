// Examples of commonly used models
import { BasicModel } from "objectmodel"

export const Primitive = BasicModel([Boolean, Number, String, Symbol]);

// Booleans-like
export const Falsy = BasicModel([Primitive, null, undefined]).assert(function isFalsy(val){ return !val });
export const Truthy = BasicModel([Primitive, Object]).assert(function isTruthy(val){ return !!val });

// Numbers
export const Integer = BasicModel(Number).assert(Number.isInteger);
export const SafeInteger = BasicModel(Number).assert(Number.isSafeInteger);
export const FiniteNumber = BasicModel(Number).assert(Number.isFinite);
export const PositiveNumber = BasicModel(Number).assert(function isPositive(val){ return val >= 0 });
export const NegativeNumber = BasicModel(Number).assert(function isNegative(val){ return val <= 0 });
export const PositiveInteger = PositiveNumber.extend().assert(Number.isInteger);
export const NegativeInteger = NegativeNumber.extend().assert(Number.isInteger);

// Strings
export const StringNotBlank = BasicModel(String).assert(function isNotBlank(str){ return str.trim().length > 0 });
export const NormalizedString = BasicModel(String).assert(function isNormalized(str){ return str.normalize() === str });
export const TrimmedString = BasicModel(String).assert(function isTrimmed(str){ return str.trim() === str });

// Dates
export const PastDate = BasicModel(Date).assert(function isInThePast(date){ return date.getTime() < Date.now() });
export const FutureDate = BasicModel(Date).assert(function isInTheFuture(date){ return date.getTime() > Date.now() });

// Arrays
export const ArrayNotEmpty = BasicModel(Array).assert(function isNotEmpty(arr){ return arr.length > 0 });
export const ArrayUnique = BasicModel(Array).assert(function hasNoDuplicates(arr){
	return arr.every((val, idx) => arr.indexOf(val) === idx)
});
export const ArrayDense = BasicModel(Array).assert(function hasNoHoles(arr){
	return arr.filter(() => true).length === arr.length
});