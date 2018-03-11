import {is, isArray, isFunction, isObject, isString} from "./helpers.js"
import Model from "./model.js"

export const
	format = (obj, stack = []) => {
		if (stack.length > 15 || stack.includes(obj)) return '...'
		if (obj === null || obj === undefined) return String(obj)
		if (isString(obj)) return `"${obj}"`
		if (is(Model, obj)) return obj.toString(stack)

		stack.unshift(obj)

		if (isFunction(obj)) return obj.name || obj.toString()
		if (is(Map, obj) || is(Set, obj)) return format([...obj])
		if (isArray(obj)) return `[${obj.map(item => format(item, stack)).join(', ')}]`
		if (obj.toString !== Object.prototype.toString) return obj.toString()
		if (obj && isObject(obj)) {
			let props  = Object.keys(obj),
			    indent = '\t'.repeat(stack.length)
			return `{${props.map(
				key => `\n${indent + key}: ${format(obj[key], stack.slice())}`
			).join(',')} ${props.length ? `\n${indent.slice(1)}` : ''}}`
		}

		return String(obj)
	},

	formatPath = (path, key) => path ? path + '.' + key : key