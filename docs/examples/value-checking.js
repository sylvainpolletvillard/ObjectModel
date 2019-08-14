import { ObjectModel } from "objectmodel";

const Shirt = new ObjectModel({
  // the only acceptable value is "clothes"
  category: "clothes",

  // valid values: 38, 42, "S", "M", "L", "XL", "XXL"...
  size: [Number, "M", /^X{0,2}[SL]$/],

  // valid values: "black", "#FF0000", undefined...
  color: ["black", "white", new RegExp("^#([A-F0-9]{6})$"), undefined]
});

let myShirt = new Shirt({
  color: "pink",
  size: "XS",
  category: "clothes"
});
