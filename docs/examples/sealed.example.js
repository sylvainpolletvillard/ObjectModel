import SealedModel from "./sealed.js";

const Package = SealedModel({
  name: String,
  config: { verbose: [Boolean] }
});

const Foo = new Package({ name: "foo", _id: 1 });
// TypeError: Undeclared properties in the sealed model definition: _id
const Bar = new Package({ name: "bar" });
Bar.config.hack = true;
// TypeError: property config.hack is not declared in the sealed model definition
Package.sealed = false;
Bar.config.hack = true; // no more exceptions thrown
