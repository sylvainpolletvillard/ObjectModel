import ObjectModel from "./object-model"
import BasicModel from "./basic-model"
import {is, isFunction, isPlainObject} from "./helpers"

const styles = {
	list: `list-style-type: none; padding: 0; margin: 0;`,
	listitem: `padding: 0 0 0 1em;`,
	model: `color: #8959a8; font-weight: bold`,
	function: `color: #4271ae`,
	string: `color: #C41A16`,
	value: `color: #1C00CF`
};

function toJsonML(x, config){
	if(x === null || x === undefined)
		return ["span", { style: styles.value }, String(x)];

	if(is(BasicModel, x))
		return ["span", { style: styles.model }, is(ObjectModel, x) ? x.name : x.toString()];

	if(isPlainObject(x))
		return [
			'ol', { style: styles.list },
			'{',
			...Object.keys(x).map(prop => ['li', { style: styles.listitem },
				['span', {}, prop + ': '],
				x[prop] ? ['object', {object: x[prop], config}] : toJsonML(x[prop], config)
			]),
			'}'
		];

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
			.concat(Object.keys(o).map(prop => ['li', { style: styles.listitem },
				['span', {}, prop + ': '],
				['object', { object: o[prop], config: { fromObjectModel: true } }]
			]))
	}
}

const ModelInstanceFormatter = {
	header: function(x, config={}) {
		if(!x) return null;

		const model = Object.getPrototypeOf(x).constructor;
		if(is(ObjectModel, model)){
			return ["span", { style: styles.model }, model.name];
		}
		if(config.fromModelInstance && isPlainObject(x)){
			return toJsonML(x, config)
		}

		return null;
	},
	hasBody: function(x) {
		return (x && is(ObjectModel, Object.getPrototypeOf(x).constructor));
	},
	body: function(x) {
		const model = Object.getPrototypeOf(x).constructor;
		return ['ol', { style: styles.list }]
			.concat(Object.keys(model.definition).map(prop => ['li', { style: styles.listitem },
				['span', {}, prop + ': '],
				x[prop] ? ['object', { object: x[prop], config: { fromModelInstance: true } }] : toJsonML(x[prop])
			]))
	}
}

if (typeof window !== 'undefined') {
	window.devtoolsFormatters = (window.devtoolsFormatters || [])
		.concat(ModelFormatter, ModelInstanceFormatter);
}