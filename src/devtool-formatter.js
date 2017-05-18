import ObjectModel from "./object-model"
import BasicModel from "./basic-model"
import {is, isFunction, isPlainObject} from "./helpers"

const styles = {
	list: `list-style-type: none; padding: 0; margin: 0;`,
	listItem: `padding: 0 0 0 1em;`,
	model: `color: #43a047; font-style: italic`,
	function: `color: #4271ae`,
	string: `color: #C41A16`,
	value: `color: #1C00CF`,
	property: `color: #881391`,
	private: `color: #B871BD`,
	null: `color: #808080`
};

function isPrivate(prop, model){
	return is(BasicModel, model) && model.conventionForPrivate(prop)
}

function toJsonML(x, config){
	if(x === null || x === undefined)
		return ["span", { style: styles.null }, String(x)];

	if(is(BasicModel, x))
		return ["span", { style: styles.model }, is(ObjectModel, x) ? x.name : x.toString()];

	if(isPlainObject(x)){
		const model = Object.getPrototypeOf(x).constructor;
		return [
			'ol', { style: styles.list },
			'{',
			...Object.keys(x).map(prop => ['li', { style: styles.listItem },
				['span', { style: isPrivate(prop, model) ? styles.private : styles.property }, prop], ': ',
				x[prop] ? ['object', {object: x[prop], config}] : toJsonML(x[prop], config)
			]),
			'}'
		];
	}

	if(isFunction(x))
		return ["span", { style: styles.function }, x.name || x.toString()];

	if(is(Array, x)){
		let def = [];
		if(x.length === 1) x.push(undefined, null);
		for(let i=0; i < x.length; i++){
			def.push(x[i] ? ['object', { object: x[i], config }] : toJsonML(x[i]))
			if(i < x.length - 1) def.push(' or ')
		}
		return ["span", {}, ...def]
	}

	return null;
}

const ModelFormatter = {
	header: function(x, config={}) {
		if (config.fromObjectModel || is(BasicModel, x))
			return toJsonML(x, config);

		return null;
	},
	hasBody: function(x) {
		return x instanceof ObjectModel
	},
	body: function(x) {
		const o = (x instanceof ObjectModel ? x.definition : x);
		return ['ol', { style: styles.list }]
			.concat(Object.keys(o).map(prop => ['li', { style: styles.listItem },
				['span', { style: isPrivate(prop, x) ? styles.private : styles.property }, prop], ': ',
				['object', { object: o[prop], config: { fromObjectModel: true } }]
			]))
	}
}

const ModelInstanceFormatter = {
	header: function(x, config={}) {
		if(!x) return null;
		if(config.fromModelInstance && isPlainObject(x)){
			return toJsonML(x, config)
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
		const model = Object.getPrototypeOf(x).constructor;
		return ['ol', { style: styles.list }]
			.concat(Object.keys(x).map(prop => ['li', { style: styles.listItem },
				['span', { style: isPrivate(prop, model) ? styles.private : styles.property }, prop], ': ',
				x[prop] ? ['object', { object: x[prop], config: { fromModelInstance: true } }] : toJsonML(x[prop])
			]))
	}
}

if (typeof window !== 'undefined') {
	window.devtoolsFormatters = (window.devtoolsFormatters || [])
		.concat(ModelFormatter, ModelInstanceFormatter);
}