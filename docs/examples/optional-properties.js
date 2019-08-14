import { ObjectModel } from "objectmodel";

const User = ObjectModel({
  email: String, // mandatory
  name: [String] // optional
});

const stan = User({ email: "stan@smith.com" }); // no exceptions
const roger = User({ name: "Roger" }); // email is mandatory
// TypeError: expecting email to be String, got undefined
