Model[FUNCTION] = function FunctionModel(){

	const model = function(fn) {

		const def = model[DEFINITION];
		const proxyFn = function () {
			const args = [];
			Object.assign(args, def[DEFAULTS]);
			Object.assign(args, [...arguments]);
			if (args.length > def[ARGS].length) {
				model[ERROR_STACK].push({
					[EXPECTED]: toString(fn) + " to be called with " + def[ARGS].length + " "+ARGS,
					[RECEIVED]: args.length
				})
			}
			def[ARGS].forEach((argDef, i) => checkDefinition(args[i], argDef, ARGS + '[' + i + ']', [], model[ERROR_STACK]));
			matchAssertions(args, model[ASSERTIONS], model[ERROR_STACK]);
			const returnValue = fn.apply(this, args);
			if (RETURN in def) {
				checkDefinition(returnValue, def[RETURN], RETURN+' value', [], model[ERROR_STACK]);
			}
			model[UNSTACK]();
			return returnValue;
		};
		setConstructor(proxyFn, model);
		return proxyFn;
	};

	setConstructorProto(model, Function[PROTO]);

	const def = { [ARGS]: [...arguments] };
	initModel(model, def, Model[FUNCTION]);
	return model;
};

setConstructorProto(Model[FUNCTION], Model[PROTO]);

const FunctionModelProto = Model[FUNCTION][PROTO];

FunctionModelProto.toString = function(stack){
	let out = FUNCTION + '(' + this[DEFINITION][ARGS].map(argDef => toString(argDef, stack)).join(",") +')';
	if(RETURN in this[DEFINITION]) {
		out += " => " + RETURN + toString(this[DEFINITION][RETURN]);
	}
	return out;
};

FunctionModelProto[RETURN] = function(def){
	this[DEFINITION][RETURN] = def;
	return this;
};

FunctionModelProto[DEFAULTS] = function(){
	this[DEFINITION][DEFAULTS] = [...arguments];
	return this;
};

// private methods
define(FunctionModelProto, VALIDATOR, function(f, path, callStack, errorStack){
	if(!isFunction(f)){
		errorStack.push({
			[EXPECTED]: FUNCTION,
			[RECEIVED]: f,
			[PATH]: path
		});
	}
});