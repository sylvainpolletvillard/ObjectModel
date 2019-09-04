import { ObjectModel } from "objectmodel";

const Animation = new ObjectModel({
	// can be a Number or a String
	delay: [Number, String],

	// optional property which can be a Boolean or a String
	easing: [Boolean, String, undefined]
});

const opening = new Animation({ delay: 300 }); // easing is optional
opening.delay = "fast"; // String is a valid type
opening.delay = null;
// TypeError: expecting delay to be Number or String, got null
opening.easing = true; // Boolean is a valid type
opening.easing = 1;
// TypeError: expecting easing to be Boolean or String or undefined, got Number 1
