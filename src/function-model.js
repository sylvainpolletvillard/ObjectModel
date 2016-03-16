Model.Function = function FunctionModel(){

	var model = function(fn) {

		var def = model.definition;
		var proxyFn = function () {
			var args = [];
			merge(args, def.defaults);
			merge(args, cloneArray(arguments));
			if (args.length !== def.arguments.length) {
				model.errorCollector({
					expected: [toString(fn) + " to be called with " + def.arguments.length + " arguments"],
					received: args.length
				});
			}
			def.arguments.forEach(function (argDef, i) {
				checkDefinition(args[i], argDef, 'arguments[' + i + ']', [], model.errorCollector);
			});
			matchAssertions(args, model.assertions, model.errorCollector);
			var returnValue = fn.apply(this, args);
			if ("return" in def) {
				checkDefinition(returnValue, def.return, 'return value', [], model.errorCollector);
			}
			return returnValue;
		};
		setConstructor(proxyFn, model);
		return proxyFn;
	};

	setProto(model, Function.prototype);
	setConstructor(model, Model.Function);
	model.definition = { arguments: cloneArray(arguments) };
	model.assertions = [];
	return model;
};

setProto(Model.Function, Model.prototype, Model);

Model.Function.prototype.toString = function(stack){
	var out = 'Model.Function('+this.definition.arguments.map(function(argDef){ return toString(argDef, stack); }).join(",") +')';
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
		this.errorCollector({ expected: ["Function"], received: f });
	}
});