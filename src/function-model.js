Model.Function = function FunctionModel(){

	var model = function(fn) {

		var def = model.definition;
		var proxyFn = function () {
			var args = merge(cloneArray(arguments), def.defaults);
			if (args.length !== def.arguments.length) {
				throw new TypeError("expecting " + toString(fn) + " to be called with " + def.arguments.length + " arguments, got " + args.length);
			}
			def.arguments.forEach(function (argDef, i) {
				checkDefinition(args[i], argDef, 'arguments[' + i + ']', []);
			});
			matchAssertions(args, model.assertions);
			var returnValue = fn.apply(this, args);
			if ("return" in def) {
				checkDefinition(returnValue, def.return, 'return value', []);
			}
			return returnValue;
		};
		setConstructor(proxyFn, model);
		return proxyFn;
	};

	setProto(model, Object.create(Function.prototype));
	setConstructor(model, FunctionModel);
	model.definition = { arguments: cloneArray(arguments) };
	model.assertions = [];
	return model;
};

setProto(Model.Function, Object.create(Model.prototype));
Model.Function.constructor.prototype = Model;

Model.Function.prototype.validate = function (f) {
	if(!isFunction(f)){
		throw new TypeError("expecting a function, got: " + toString(f));
	}
};

Model.Function.prototype.toString = function(ndeep){
	var out = 'Model.Function('+this.definition.arguments.map(function(argDef){ return toString(argDef, ndeep); }).join(",") +')';
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