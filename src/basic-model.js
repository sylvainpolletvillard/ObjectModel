import {extend, is, setConstructor} from "./helpers"
import {extendDefinition} from "./definition"
import {extendModel, initModel, Model} from "./model"


export default function BasicModel() {
	const model = function (val = model.default) {
		model.validate(val)
		return val
	}

	setConstructor(model, BasicModel)
	initModel(model, arguments)
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