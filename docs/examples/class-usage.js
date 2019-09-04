import { Model } from "objectmodel";

class Character extends Model({ lastName: String, firstName: String }) {
	get fullName() {
		return `${this.firstName} ${this.lastName}`;
	}
}

const rick = new Character({ lastName: "Sanchez", firstName: "Rick" });
rick.lastName = 132;
//TypeError: expecting lastName to be String, got Number 132
console.log(rick.fullName); // "Rick Sanchez"
