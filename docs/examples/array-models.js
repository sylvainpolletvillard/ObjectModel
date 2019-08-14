import { ArrayModel } from "objectmodel";

const Cards = new ArrayModel([Number, "J", "Q", "K"]);

// Hand is an array of 2 Numbers, J, Q, or K
const Hand = Cards.extend().assert(
  a => a.length === 2,
  "should have two cards"
);

const myHand = Hand([7, "K"]);
myHand[0] = "Joker";
// TypeError: expecting Array[0] to be Number or "J" or "Q" or "K", got String "Joker"

myHand.push("K");
// TypeError: assertion "should have two cards" returned false for value[7, "Joker", "K"]
