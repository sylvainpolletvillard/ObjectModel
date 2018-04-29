import {Model, ObjectModel} from "./object-model.js"
import {getProto, is, isArray, isFunction, isPlainObject, mapProps} from "./helpers.js"

let styles = {
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

let getModel = (instance) => {
	if (instance === undefined || instance === null)
		return null

	let proto = getProto(instance);
	if (!proto || !proto.constructor || !is(Model, proto.constructor))
		return null

	return proto.constructor
}

let span = (style, ...children) => ["span", {style}, ...children]

let format = (x, config) => {
	if (x === null || x === undefined)
		return span(styles.null, ""+x);

	if (typeof x === "boolean")
		return span(styles.boolean, x);

	if (typeof x === "number")
		return span(styles.number, x);

	if (typeof x === "string")
		return span(styles.string, `"${x}"`);

	if (isArray(x)) {
		let def = [];
		if (x.length === 1) x.push(undefined, null);
		for (let i = 0; i < x.length; i++) {
			def.push(format(x[i]))
			if (i < x.length - 1) def.push(' or ')
		}
		return span('', ...def)
	}

	if (isPlainObject(x))
		return formatObject(x, getModel(x), config)

	if (isFunction(x) && !is(Model, x))
		return span(styles.function, x.name || x.toString());

	return x ? ['object', {object: x, config}] : null
}

let formatObject = (o, model, config) => {
	return span('',
		'{',
		['ol', {style: styles.list}, ...mapProps(o, prop => {
			let isPrivate = model && model.conventionForPrivate(prop);
			return ['li', {style: styles.listItem},
				span(isPrivate ? styles.private : styles.property, prop), ': ',
				format(o[prop], config)
			]
		})],
		'}'
	)
}

let formatHeader = (x, config) => {
	if (is(Model, x))
		return span(styles.model, getProto(x).name)

	if (config.fromModel || isPlainObject(x) || isArray(x))
		return format(x)

	return null;
}

let ModelFormatter = {
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

let ModelInstanceFormatter = {
	header(x, config = {}) {
		if (config.fromInstance && isPlainObject(x)) {
			return formatHeader(x, config)
		}

		let model = getModel(x);
		if (is(Model, model)) {
			return span(styles.model, model.name)
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