Model[FUNCTION] = function FunctionModel(){

	var model = function(fn) {

		var def = model[DEFINITION];
		var proxyFn = function () {
			var args = [];
			merge(args, def[DEFAULTS]);
			merge(args, cloneArray(arguments));
			if (args.length > def[ARGS].length) {
				var err = {};
				err[EXPECTED] = toString(fn) + " to be called with " + def[ARGS].length + " "+ARGS;
				err[RESULT] = args.length;
				model[ERROR_STACK].push(err);
			}
			def[ARGS].forEach(function (argDef, i) {
				checkDefinition(args[i], argDef, ARGS + '[' + i + ']', [], model[ERROR_STACK]);
			});
			matchAssertions(args, model[ASSERTIONS], model[ERROR_STACK]);
			var returnValue = fn.apply(this, args);
			if (RETURN in def) {
				checkDefinition(returnValue, def[RETURN], RETURN+' value', [], model[ERROR_STACK]);
			}
			model[UNSTACK]();
			return returnValue;
		};
		setConstructor(proxyFn, model);
		return proxyFn;
	};

	setProto(model, Function[PROTO]);
	setConstructor(model, Model[FUNCTION]);
	model[DEFINITION] = {};
	model[DEFINITION][ARGS] = cloneArray(arguments);
	model[ASSERTIONS] = [];
	model[ERROR_STACK] = [];
	return model;
};

setProto(Model[FUNCTION], Model[PROTO], Model);
var FunctionModelProto = Model[FUNCTION][PROTO];

FunctionModelProto.toString = function(stack){
	var out = 'Model.' + FUNCTION + '(' + this[DEFINITION][ARGS].map(function(argDef){
			return toString(argDef, stack);
		}).join(",") +')';
	if(RETURN in this[DEFINITION]) {
		out += "." + RETURN + "(" + toString(this[DEFINITION][RETURN]) + ")";
	}
	return out;
};

FunctionModelProto[RETURN] = function(def){
	this[DEFINITION][RETURN] = def;
	return this;
};

FunctionModelProto[DEFAULTS] = function(){
	this[DEFINITION][DEFAULTS] = cloneArray(arguments);
	return this;
};

// private methods
define(FunctionModelProto, VALIDATOR, function(f, path, callStack, errorStack){
	if(!isFunction(f)){
		var err = {};
		err[EXPECTED] = FUNCTION;
		err[RESULT] = f;
		err[PATH] = path;
		errorStack.push(err);
	}
});