import { extend, setConstructor } from "./helpers"
import { Model } from "./model"

export default function BasicModel(def){
	const model = function(val = model.default) {
		model.validate(val)
		return val
	}

	setConstructor(model, BasicModel)
	model._init(arguments)
	return model
}

extend(BasicModel, Model)