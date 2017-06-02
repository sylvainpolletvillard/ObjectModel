import {extend, is, setConstructor} from "./helpers"
import {extendModel, Model} from "./model"
import {extendDefinition} from "./definition"

export default function BasicModel() {
	const model = function (val = model.default) {
		model.validate(val)
		return val
	}

	setConstructor(model, BasicModel)
	model._init(arguments)
	return model
}

extend(BasicModel, Model, {
	extend(...newParts) {
		const child = extendModel(new BasicModel(extendDefinition(this.definition, newParts)), this)
		for (let part of newParts) {
			if (is(BasicModel, part)) child.assertions.push(...part.assertions)
		}

		return child
	}
})