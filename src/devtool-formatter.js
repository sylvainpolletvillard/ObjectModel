import { Model, BasicModel, ObjectModel, _original } from "./object-model.js"
import ArrayModel from "./array-model.js"
import SetModel from "./set-model.js"
import MapModel from "./map-model.js"
import FunctionModel from "./function-model.js"
import { getProto, is, isFunction, isPlainObject } from "./helpers.js"

const styles = {
	list: `list-style-type: none; padding: 0; margin: 0;`,
	listItem: `padding: 0 0 0 1em;`,
	model: `color: #3e999f;`,
	sealedModel: `color: #3e999f; font-weight: bold`,
	instance: `color: #718c00; font-style: italic`,
	function: `color: #4271AE`,
	string: `color: #C41A16`,
	number: `color: #1C00CF`,
	boolean: `color: #AA0D91`,
	property: `color: #8959a8`,
	private: `color: #C19ED8`,
	constant: `color: #8959a8; font-weight: bold`,
	privateConstant: `color: #C19ED8; font-weight: bold`,
	null: `color: #8e908c`,
	undeclared: `color: #C0C0C0;`,
	proto: `color: #B871BD; font-style: italic`
};

const getModel = (instance) => {
	if (instance === undefined || instance === null)
		return null

	let proto = getProto(instance);
	if (!proto || !proto.constructor || !is(Model, proto.constructor))
		return null

	return proto.constructor
}

const span = (style, ...children) => ["span", { style }, ...children]

const format = (x, config = {}) => {
	if (x === null || x === undefined)
		return span(styles.null, "" + x);

	if (typeof x === "boolean")
		return span(styles.boolean, x);

	if (typeof x === "number")
		return span(styles.number, x);

	if (typeof x === "string")
		return span(styles.string, `"${x}"`);

	if (Array.isArray(x) && config.isModelDefinition) {
		let def = [];
		if (x.length === 1) x.push(undefined, null);
		for (let i = 0; i < x.length; i++) {
			def.push(format(x[i], config))
			if (i < x.length - 1) def.push(' or ')
		}
		return span('', ...def)
	}

	if (isPlainObject(x))
		return formatObject(x, getModel(x), config)

	if (isFunction(x) && !is(Model, x) && config.isModelDefinition)
		return span(styles.function, x.name || x.toString());

	return ['object', { object: x, config }]
}

const formatObject = (o, model, config) => span('',
	'{',
	['ol', { style: styles.list }, ...Object.keys(o).map(prop =>
		['li', { style: styles.listItem }, span(styles.property, prop), ': ', format(o[prop], config)])
	],
	'}'
)

const formatModel = model => {
	const parts = [],
		cfg = { isModelDefinition: true },
		def = model.definition,
		formatList = (list, map) => list.reduce((r, e) => [...r, map(e), ", "], []).slice(0, 2 * list.length - 1);

	if (is(BasicModel, model)) parts.push(format(def, cfg))
	if (is(ArrayModel, model)) parts.push("Array of ", format(def, cfg))
	if (is(SetModel, model)) parts.push("Set of ", format(def, cfg))
	if (is(MapModel, model)) parts.push("Map of ", format(def.key, cfg), " : ", format(def.value, cfg))
	if (is(FunctionModel, model)) {
		parts.push("Function(", ...formatList(def.arguments, arg => format(arg, cfg)), ")")
		if ("return" in def) parts.push(" => ", format(def.return, cfg))
	}

	if (model.assertions.length > 0) {
		parts.push("\n(assertions: ", ...formatList(model.assertions, f => ['object', { object: f }]), ")")
	}

	return span(styles.model, ...parts)
}

const ModelFormatter = {
	header(x, config = {}) {
		if (is(ObjectModel, x))
			return span(x.sealed ? styles.sealedModel : styles.model, x.name)

		if (is(Model, x)) {
			return formatModel(x)
		}

		if (config.isModelDefinition && isPlainObject(x))
			return format(x, config)

		return null;
	},
	hasBody(x) {
		return is(ObjectModel, x)
	},
	body(model) {
		return span('',
			'{',
			['ol', { style: styles.list }, ...Object.keys(model.definition).map(prop => {
				let isPrivate = model.conventionForPrivate(prop),
					isConstant = model.conventionForConstant(prop),
					hasDefault = model.prototype.hasOwnProperty(prop),
					style = styles.property;

				if (isPrivate) {
					style = isConstant ? styles.privateConstant : styles.private
				} else if (isConstant) {
					style = styles.constant
				}

				return ['li', { style: styles.listItem },
					span(style, prop), ': ', format(model.definition[prop], { isModelDefinition: true }),
					hasDefault ? span(styles.proto, ' = ', format(model.prototype[prop])) : ''
				]
			})],
			'}'
		)
	}
}

const ModelInstanceFormatter = {
	header(x, config = {}) {
		if (config.isInstanceProperty && isPlainObject(x)) {
			return format(x, config)
		}

		let model = getModel(x);
		if (is(Model, model)) {
			let parts = is(ObjectModel, model) ? [model.name] : [['object', { object: x[_original] }], ` (${model.name})`];
			return span(styles.instance, ...parts)
		}

		return null;
	},
	hasBody(x) {
		return x && is(ObjectModel, getModel(x))
	},
	body(x) {
		const model = getModel(x)
		const o = x[_original] || x;
		return span('',
			'{',
			[
				'ol',
				{ style: styles.list },
				...Object.keys(o).map(prop => {
					let isPrivate = model.conventionForPrivate(prop),
						isConstant = model.conventionForConstant(prop),
						isDeclared = prop in model.definition,
						style = styles.property;

					if (!isDeclared) {
						style = styles.undeclared
					} else if (isPrivate) {
						style = isConstant ? styles.privateConstant : styles.private
					} else if (isConstant) {
						style = styles.constant
					}

					return ['li', { style: styles.listItem },
						span(style, prop), ': ', format(o[prop], { isInstanceProperty: true })
					]
				}),
				['li', { style: styles.listItem },
					span(styles.proto, '__proto__', ': ', ['object', { object: getProto(x) }])
				]
			],
			'}'
		)
	}
}

if (typeof window !== "undefined") {
	window.devtoolsFormatters = (window.devtoolsFormatters || [])
		.concat(ModelFormatter, ModelInstanceFormatter);
}