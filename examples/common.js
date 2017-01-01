// Examples of commonly used models
import Model from "objectmodel"

Model.Primitive = Model([Boolean, Number, String, Symbol]);

// Booleans-like
Model.Falsy = Model([Model.Primitive, null, undefined]).assert(function isFalsy(val){ return !val });
Model.Truthy = Model([Model.Primitive, Object]).assert(function isTruthy(val){ return !!val });

// Numbers
Model.Integer = Model(Number).assert(Number.isInteger);
Model.SafeInteger = Model(Number).assert(Number.isSafeInteger);
Model.FiniteNumber = Model(Number).assert(Number.isFinite);
Model.PositiveNumber = Model(Number).assert(function isPositive(val){ return val >= 0 });
Model.NegativeNumber = Model(Number).assert(function isNegative(val){ return val <= 0 });
Model.PositiveInteger = Model.PositiveNumber.extend().assert(Number.isInteger);
Model.NegativeInteger = Model.NegativeNumber.extend().assert(Number.isInteger);

// Strings
Model.StringNotBlank = Model(String).assert(function isNotBlank(str){ return str.trim().length > 0 });
Model.NormalizedString = Model(String).assert(function isNormalized(str){ return str.normalize() === str });
Model.TrimmedString = Model(String).assert(function isTrimmed(str){ return str.trim() === str });

// Dates
Model.PastDate = Model(Date).assert(function isInThePast(date){ return date.getTime() < Date.now() });
Model.FutureDate = Model(Date).assert(function isInTheFuture(date){ return date.getTime() > Date.now() });

// Arrays
Model.ArrayNotEmpty = Model(Array).assert(function isNotEmpty(arr){ return arr.length > 0 });
Model.ArrayUnique = Model(Array).assert(function hasNoDuplicates(arr){
	return arr.every(function(val, idx){
		return arr.indexOf(val) === idx
	})
});
Model.ArrayDense = Model(Array).assert(function hasNoHoles(arr){
	return arr.filter(function(x){ return true }).length === arr.length
});