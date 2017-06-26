import ObjectModel from "./object-model"
import Model from "./model"
import {getProto, is, isArray, isFunction, isPlainObject} from "./helpers"

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

function getModel(instance) {
	if (instance === undefined || instance === null)
		return null

	const proto = getProto(instance);
	if (!proto || !proto.constructor || !is(Model, proto.constructor))
		return null

	return proto.constructor
}

const span = (value, style) => ["span", {style}, value]

function format(x, config) {
	if (x === null || x === undefined)
		return span(String(x), styles.null);

	if (typeof x === "boolean")
		return span(x, styles.boolean);

	if (typeof x === "number")
		return span(x, styles.number);

	if (typeof x === "string")
		return span(`"${x}"`, styles.string);

	if (isArray(x)) {
		let def = [];
		if (x.length === 1) x.push(undefined, null);
		for (let i = 0; i < x.length; i++) {
			def.push(format(x[i]))
			if (i < x.length - 1) def.push(' or ')
		}
		return span(...def)
	}

	if (isPlainObject(x))
		return formatObject(x, getModel(x), config)

	if (isFunction(x) && !is(Model, x))
		return span(x.name || x.toString(), styles.function);

	return x ? ['object', {object: x, config}] : null
}

function formatObject(o, model, config) {
	return [
		'ol', {style: styles.list},
		'{',
		...Object.keys(o).map(prop => {
			let isPrivate = model && model.conventionForPrivate(prop);
			return ['li', {style: styles.listItem},
				span(prop, isPrivate ? styles.private : styles.property), ': ',
				format(o[prop], config)
			]
		}),
		'}'
	];
}

function formatHeader(x, config) {
	if (is(Model, x))
		return span(x.name, styles.model)

	if (config.fromModel || isPlainObject(x) || isArray(x))
		return format(x)

	return null;
}

const ModelFormatter = {
	header(x, config = {}) {
		if (config.fromModel || is(Model, x))
			return formatHeader(x, config);

		return null;
	},
	hasBody(x) {
		return is(Model, x)
	},
	body(x) {
		return format(x.definition, {fromModel: true})
	}
}

const ModelInstanceFormatter = {
	header(x, config = {}) {
		if (config.fromInstance && isPlainObject(x)) {
			return formatHeader(x, config)
		}

		const model = getModel(x);
		if (is(Model, model)) {
			return span(x.constructor.name, styles.model)
		}

		return null;
	},
	hasBody(x) {
		return x && is(ObjectModel, getModel(x))
	},
	body(x) {
		return formatObject(x, getModel(x), {fromInstance: true})
	}
}

if (typeof window !== "undefined") {
	window.devtoolsFormatters = (window.devtoolsFormatters || [])
		.concat(ModelFormatter, ModelInstanceFormatter);
}