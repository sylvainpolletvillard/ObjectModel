Model.Function = function FunctionModel(){

	var model = function(fn) {
		if(!(this instanceof model)) {
			return new model(fn);
		}

		var def = model.definition;
		var proxyFn = function () {
			var args = merge(cloneArray(arguments), def.defaults);
			if (args.length !== def.arguments.length) {
				throw new TypeError("expecting " + toString(fn) + " to be called with " + def.arguments.length + " arguments, got " + args.length);
			}
			def.arguments.forEach(function (argDef, i) {
				checkDefinitions(args[i], argDef, 'arguments[' + i + ']', []);
			});
			matchAssertions(args, model.assertions);
			var returnValue = fn.apply(this, args);
			if ("return" in def) {
				checkDefinitions(returnValue, def.return, 'return value', []);
			}
			return returnValue;
		};
		Object.setPrototypeOf(proxyFn, model.prototype);
		proxyFn.constructor = FunctionModel;
		return proxyFn;
	};

	return initModel(model, FunctionModel, Object.create(Function.prototype), { arguments: cloneArray(arguments) });
};

Model.Function.prototype = Object.create(Model.prototype);
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