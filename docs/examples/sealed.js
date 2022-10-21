import { ObjectModel } from "objectmodel";

const SealedModel = def => {
	const model = ObjectModel(def);
	model.sealed = true;
	model.extend = () => {
		throw new Error(`Sealed models cannot be extended`);
	};

	const isPlainObject = obj => typeof obj === "object" && Object.getPrototypeOf(obj) === Object.prototype
	const checkUndeclaredProps = (obj, def, undeclaredProps, path) => {
		Object.keys(obj).forEach(key => {
			let val = obj[key],
				subpath = path ? path + "." + key : key;
			if(isPlainObject(def) && !Object.prototype.hasOwnProperty.call(def, key)) {
				undeclaredProps.push(subpath);
			} else if (isPlainObject(val) && isPlainObject(def)) {
				checkUndeclaredProps(val, def[key], undeclaredProps, subpath);
			}
		});
	};

	return model.assert(
		function hasNoUndeclaredProps(obj) {
			if (!model.sealed) return true;
			let undeclaredProps = [];
			checkUndeclaredProps(obj, this.definition, undeclaredProps);
			return undeclaredProps.length === 0 ? true : undeclaredProps;
		},
		undeclaredProps =>
			`Undeclared properties in the sealed model definition: ${undeclaredProps}`
	);
};

export default SealedModel;
