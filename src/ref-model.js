import { extend, symbolify } from './helpers.js';
import { _check, _refs, cannot, formatDefinition, initModel } from './object-model.js';

export default function RefModel(key) {
	const symbol = symbolify(key);
	let referencedModel;

	return function(val, mode) {
		if (referencedModel === undefined) {
			referencedModel = _refs.get(symbol);
		}

		if (referencedModel && val !== undefined) {
			return new referencedModel(val, mode);
		}

		return new initModel(symbol, RefModel);
	}
}

extend(RefModel, Object, {
	[_check](val) {
		if (val !== undefined) {
			cannot(this, 'set value for ' + this.toString() + ' when model referenced is undefined')
		}
	},

	toString(stack) {
		return "Ref of " + formatDefinition(this.definition, stack)
	}
})
