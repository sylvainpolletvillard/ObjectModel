import ObjectModel from "./object-model"
import BasicModel from "./basic-model"
import {is, isFunction, isPlainObject} from "./helpers"

const styles = {
	list: `list-style-type: none; padding: 0; margin: 0;`,
	listItem: `padding: 0 0 0 1em;`,
	model: `color: #43a047; font-style: italic`,
	function: `color: #4271ae`,
	string: `color: #C41A16`,
	number: `color: #1C00CF`,
	boolean: `color: #AA0D91`,
	property: `color: #881391`,
	private: `color: #B871BD`,
	null: `color: #808080`
};

function iterateKeys(o, model, config){
	return [
		'ol', { style: styles.list },
		'{',
		...Object.keys(o).map(prop => {
			let isPrivate = is(BasicModel, model) && model.conventionForPrivate(prop);
			return ['li', { style: styles.listItem },
				['span', { style: isPrivate ? styles.private : styles.property }, prop], ': ',
				getValue(o[prop], config)
			]
		}),
		'}'
	];
}

function getValue(x, config){
	if(x === null || x === undefined)
		return ["span", { style: styles.null }, String(x)];

	if(typeof x === "boolean")
		return ["span", { style: styles.boolean }, x];

	if(typeof x === "number")
		return ["span", { style: styles.number }, x];

	if(typeof x === "string")
		return ["span", { style: styles.string }, `"${x}"`];

	if(isFunction(x) && !is(BasicModel, x))
		return ["span", { style: styles.function }, x.name || x.toString()];

	return ['object', { object: x, config }]
}

function getHeader(x, config){
	if(is(BasicModel, x))
		return ["span", { style: styles.model }, is(ObjectModel, x) ? x.name : x.toString()];

	if(isPlainObject(x))
		return iterateKeys(x, Object.getPrototypeOf(x).constructor, config)

	if(is(Array, x)){
		let def = [];
		if(x.length === 1) x.push(undefined, null);
		for(let i=0; i < x.length; i++){
			def.push( getValue(x[i]) )
			if(i < x.length - 1) def.push(' or ')
		}
		return ["span", {}, ...def]
	}

	return null;
}

const ModelFormatter = {
	header: function(x, config={}) {
		if (config.fromObjectModel || is(BasicModel, x))
			return getHeader(x, config);

		return null;
	},
	hasBody: function(x) {
		return x instanceof ObjectModel
	},
	body: function(x) {
		return iterateKeys(x instanceof ObjectModel ? x.definition : x, x, { fromObjectModel: true })
	}
}

const ModelInstanceFormatter = {
	header: function(x, config={}) {
		if(!x) return null;
		if(config.fromModelInstance && isPlainObject(x)){
			return getHeader(x, config)
		}

		const proto = Object.getPrototypeOf(x);
		if(!proto || !proto.constructor) return null;
		const model = proto.constructor;
		if(is(ObjectModel, model)){
			return ["span", { style: styles.model }, x.constructor.name];
		}

		return null;
	},
	hasBody: function(x) {
		return (x && is(ObjectModel, Object.getPrototypeOf(x).constructor));
	},
	body: function(x) {
		return iterateKeys(x, Object.getPrototypeOf(x).constructor, { fromModelInstance: true })
	}
}

if (typeof window !== "undefined") {
	window.devtoolsFormatters = (window.devtoolsFormatters || [])
		.concat(ModelFormatter, ModelInstanceFormatter);
}