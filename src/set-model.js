import { Model } from "./model"
import { checkDefinition, checkAssertions } from "./definition"
import { extend, setConstructor, toString } from "./helpers"

const SET_MUTATOR_METHODS = ["add", "delete", "clear"]

function SetModel(){

	const model = function(iterable) {
		const _set = new Set(iterable)
		model.validate(_set)

		for(let method of SET_MUTATOR_METHODS){
			_set[method] = function() {
				const testSet = new Set(_set)
				Set.prototype[method].apply(testSet, arguments)
				model.validate(testSet)
				return Set.prototype[method].apply(_set, arguments)
			}
		}

		setConstructor(_set, model)
		return _set
	}

	extend(model, Set)
	setConstructor(model, SetModel);
	model._init(arguments)
	return model
}

extend(SetModel, Model, {
	toString(stack){
		return "Set of " + toString(this.definition, stack)
	},

	_validate(_set, path, errors, stack){
		if(_set instanceof Set){
			for(let item of _set.values()){
				checkDefinition(item, this.definition, (path || "Set"), errors, stack)
			}
		} else {
			errors.push({
				expected: this,
				received: _set,
				path
			})
		}
		checkAssertions(_set, this, errors)
	}
})

export default SetModel