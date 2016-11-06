Model[FUNCTION] = function FunctionModel(){

	const model = function(fn = model[DEFAULT]) {
		const def = model[DEFINITION]
		const proxyFn = function () {
			const args = [];
			Object.assign(args, def[DEFAULTS])
			Object.assign(args, [...arguments])
			if (args.length > def[ARGS].length) {
				model[ERROR_STACK].push({
					[EXPECTED]: toString(fn) + " to be called with " + def[ARGS].length + " "+ARGS,
					[RECEIVED]: args.length
				})
			}
			def[ARGS].forEach((argDef, i) => {
				args[i] = checkDefinition(args[i], argDef, `${ARGS}[${i}]`, model[ERROR_STACK], [], true)
			})
			checkAssertions(args, model)

			let returnValue;
			if(!model[ERROR_STACK].length){
				returnValue = fn.apply(this, args)
				if (RETURN in def)
					returnValue = checkDefinition(returnValue, def[RETURN], RETURN+' value', model[ERROR_STACK], [], true)
			}
			model[UNSTACK_ERRORS]()
			return returnValue
		}
		setConstructor(proxyFn, model)
		return proxyFn
	}

	setConstructorProto(model, Function[PROTO])

	const def = { [ARGS]: [...arguments] }
	initModel(model, def, Model[FUNCTION])
	return model
}

setConstructorProto(Model[FUNCTION], Model[PROTO])

Object.assign(Model[FUNCTION][PROTO], {

	toString(stack){
		let out = FUNCTION + '(' + this[DEFINITION][ARGS].map(argDef => toString(argDef, stack)).join(",") +')'
		if(RETURN in this[DEFINITION]) {
			out += " => " + toString(this[DEFINITION][RETURN])
		}
		return out
	},

	[RETURN](def){
		this[DEFINITION][RETURN] = def
		return this
	},

	[DEFAULTS](){
		this[DEFINITION][DEFAULTS] = [...arguments]
		return this
	},
	[VALIDATOR](f, path, errorStack){
		if (!isFunction(f)) {
			errorStack.push({
				[EXPECTED]: FUNCTION,
				[RECEIVED]: f,
				[PATH]: path
			})
		}
	}
})