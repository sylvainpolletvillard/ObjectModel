import {setConstructorProto} from "./helpers"
import {initModel, Model} from "./model"

export default function BasicModel(def){
	const model = function(val = model.default) {
		model.validate(val)
		return val
	}

	initModel(model, arguments, BasicModel)
	return model
}

setConstructorProto(BasicModel, Model.prototype)