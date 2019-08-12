import { ObjectModel } from "objectmodel"

const SealedModel = def => {
	let model = ObjectModel(def)
	model.sealed = true;
	model.extend = () => { throw new Error(`Sealed models cannot be extended`); };

	const checkUndeclaredProps = (obj, def, undeclaredProps, path) => {
		Object.keys(obj).map(key => {
			let val = obj[key],
				subpath = path ? path + '.' + key : key
			if (!Object.prototype.hasOwnProperty.call(def, key)) {
				undeclaredProps.push(subpath)
			} else if (val && typeof val === "object" && Object.getPrototypeOf(val) === Object.prototype) {
				checkUndeclaredProps(val, def[key], undeclaredProps, subpath)
			}
		})
	}

	return model.assert(function hasNoUndeclaredProps(obj) {
		if (!model.sealed) return true;
		let undeclaredProps = []
		checkUndeclaredProps(obj, this.definition, undeclaredProps)
		return undeclaredProps.length === 0 ? true : undeclaredProps
	}, undeclaredProps => `Undeclared properties in the sealed model definition: ${undeclaredProps}`)
}

export default SealedModel;

/* usage example
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
*/