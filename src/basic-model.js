import {extend, is, setConstructor} from "./helpers"
import { Model } from "./model"
import {extendDefinition} from "./definition"

export default function BasicModel() {
	const model = function(val = model.default) {
		model.validate(val)
		return val
	}

	setConstructor(model, BasicModel)
	model._init(arguments)
	return model
}

extend(BasicModel, Model, {
	extend(...newParts) {
		const extension = Model.prototype.extend.call(this, extendDefinition(this.definition, newParts))
		for(let part of newParts){
			if(is(BasicModel, part)) extension.assertions.push(...part.assertions)
		}

		return extension
	}
})