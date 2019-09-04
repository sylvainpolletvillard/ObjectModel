import { BasicModel } from "objectmodel";

const PositiveInteger = BasicModel(Number)
	.assert(Number.isInteger)
	.assert(n => n >= 0, "should be greater or equal to zero");

function isPrime(n) {
	for (let i = 2, m = Math.sqrt(n); i <= m; i++) {
		if (n % i === 0) return false;
	}
	return n > 1;
}

const PrimeNumber = PositiveInteger.extend().assert(isPrime);
//// extend to not add isPrime assertion to the Integer model

PositiveInteger(-1);
// TypeError: assertion should be greater or equal to zero returned false for value - 1

PositiveInteger(Math.sqrt(2));
// TypeError: assertion isInteger returned false for value 1.414213562373

PrimeNumber(83);
// 83

PrimeNumber(87);
// TypeError: assertion isPrime returned false for value 87
