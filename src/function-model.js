Model.Function = function FunctionModel(){

	var model = function(fn) {

		var def = model.definition;
		var proxyFn = function () {
			var args = [];
			merge(args, def.defaults);
			merge(args, cloneArray(arguments));
			if (args.length > def.arguments.length) {
				model.errorStack.push({
					expected: toString(fn) + " to be called with " + def.arguments.length + " arguments",
					result: args.length
				});
			}
			def.arguments.forEach(function (argDef, i) {
				checkDefinition(args[i], argDef, 'arguments[' + i + ']', [], model.errorStack);
			});
			matchAssertions(args, model.assertions, model.errorStack);
			var returnValue = fn.apply(this, args);
			if ("return" in def) {
				checkDefinition(returnValue, def.return, 'return value', [], model.errorStack);
			}
			model.unstack();
			return returnValue;
		};
		setConstructor(proxyFn, model);
		return proxyFn;
	};

	setProto(model, Function.prototype);
	setConstructor(model, Model.Function);
	model.definition = { arguments: cloneArray(arguments) };
	model.assertions = [];
	model.errorStack = [];
	return model;
};

setProto(Model.Function, Model.prototype, Model);

Model.Function.prototype.toString = function(stack){
	var out = 'Model.Function('+this.definition.arguments.map(function(argDef){
			return toString(argDef, stack);
		}).join(",") +')';
	if("return" in this.definition) {
		out += ".return(" + toString(this.definition.return) + ")";
	}
	return out;
};

Model.Function.prototype.return = function(def){
	this.definition.return = def;
	return this;
};

Model.Function.prototype.defaults = function(){
	this.definition.defaults = cloneArray(arguments);
	return this;
};

// private methods
define(Model.Function.prototype, "validator", function(f){
	if(!isFunction(f)){
		this.errorStack.push({ expected: "Function", result: f });
	}
});