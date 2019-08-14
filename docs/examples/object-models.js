import { ObjectModel } from "objectmodel";

const Order = new ObjectModel({
  product: {
    name: String,
    quantity: Number
  },
  orderDate: Date
});

const myOrder = new Order({
  product: { name: "Apple Pie", quantity: 1 },
  orderDate: new Date()
});

myOrder.product.quantity = 2; // no exceptions thrown
myOrder.product.quantity = false; //try to assign a Boolean
// TypeError: expecting product.quantity to be Number, got Boolean false
