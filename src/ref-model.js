import { extend, symbolify } from './helpers.js';
import { _check, _refs, formatDefinition, initModel } from './object-model.js';

export default function RefModel(key) {
	const symbol = symbolify(key);
	return _refs.has(symbol) ? _refs.get(symbol) : initModel(undefined, RefModel);
}

extend(RefModel, Object, {
	[_check]() {}, // _check is a noop for RefModel

	toString(stack) {
		return "Ref of " + formatDefinition(this.definition, stack)
	}
})
