import { BasicModel } from "objectmodel";

const NumberModel = BasicModel(Number);
// 'new' keyword is optional for models and model instances

let x = NumberModel("42");
// TypeError: expecting Number, got String "42"