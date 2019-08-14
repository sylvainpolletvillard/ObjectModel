import { FunctionModel, BasicModel } from "objectmodel";

const Numb = BasicModel(Number).assert(Number.isFinite);
const Operator = BasicModel(["+", "-", "*", "/"]);

const Calculator = FunctionModel(Numb, Operator, Numb).return(Numb);

const calc = new Calculator((a, operator, b) => eval(a + operator + b));

calc(3, "+", 1);
// 4
calc(6, "*", null);
// TypeError: expecting arguments[2] to be Number, got null
calc(1, "/", 0);
// TypeError: assertion "isFinite" returned false for value Infinity
