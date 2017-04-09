import { BasicModel, initModel } from "./basic-model"
import { checkDefinition, checkAssertions } from "./definition"
import { setConstructor, setConstructorProto, toString } from "./helpers"

const SET_MUTATOR_METHODS = ["add", "delete", "clear"]

function SetModel(def){

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

	setConstructorProto(model, Set.prototype)
	initModel(model, arguments, SetModel)
	return model
}

setConstructorProto(SetModel, BasicModel.prototype)
Object.assign(SetModel.prototype, {

	toString(stack){
		return "Set of " + toString(this.definition, stack)
	},

	_validate(_set, path, errorStack, callStack){
		if(_set instanceof Set){
			for(let item of _set.values()){
				checkDefinition(item, this.definition, (path || "Set"), errorStack, callStack)
			}
		} else {
			errorStack.push({
				expected: this,
				received: _set,
				path
			})
		}
		checkAssertions(_set, this, errorStack)
	}
})

export default SetModel