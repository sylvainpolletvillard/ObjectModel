import { ObjectModel } from "objectmodel";

const User = ObjectModel({
  email: String, // mandatory
  name: [String] // optional
});

const Person = ObjectModel({
  name: String,
  female: Boolean
});

const Order = ObjectModel({
  product: {
    name: String,
    quantity: Number
  },
  orderDate: Date
});

const Client = Person.extend(User, Order, { store: String });

Client.prototype.sendConfirmationMail = function() {
  return (
    this.email +
    ": Dear " +
    this.name +
    ", thank you for ordering " +
    this.product.quantity +
    " " +
    this.product.name +
    " on " +
    this.store
  );
};

console.log(Object.keys(Client.definition));
// ["name", "female", "email", "product", "orderDate", "store"]

const joe = new Client({
  name: "Joe",
  female: false,
  email: "joe@email.net",
  product: { name: "diapers", quantity: 100 },
  orderDate: new Date(),
  store: "daddy.net"
});

document.write(joe.sendConfirmationMail());
// joe@email.net: Dear Joe, thank you for ordering 100 diapers on daddy.net
