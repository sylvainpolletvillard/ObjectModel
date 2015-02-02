Model.Function = function FunctionModel(){

	var def = {
		args: arrayCopy(arguments)
	};

	var Constructor = function(fn) {
		if(!(this instanceof Constructor)) {
			return new Constructor(fn);
		}

		var proxyFn = function () {
			var args = merge(arrayCopy(arguments), def.defaults);
			if (args.length !== def.args.length) {
				throw new TypeError("expecting " + objToString(fn) + " to be called with " + def.args.length + " arguments, got " + args.length);
			}
			def.args.forEach(function (argDef, i) {
				matchDefinition(args[i], argDef, 'arguments[' + i + ']');
			});
			var returnValue = fn.apply(this, args);
			if ("return" in def) {
				matchDefinition(returnValue, def.return, 'return value');
			}
			return returnValue;
		};
		Object.setPrototypeOf(proxyFn, Constructor.prototype);
		return proxyFn;
	};

	Constructor.return = function(val){ def.return = val; return this; };
	Constructor.defaults = function(){ def.defaults = arrayCopy(arguments); return this };
	Constructor.isValidModelFor = isFunction;
	Constructor.toString = function(ndeep){
		var out = 'Model.Function('+def.args.map(function(argDef) { return objToString(argDef, ndeep); }).join(",") +')';
		if("return" in def) {
			out += ".return(" + objToString(def.return) + ")";
		}
		return out;
	};
	Constructor.prototype = Object.create(Function.prototype);
	Constructor.prototype.constructor = Constructor;
	Object.setPrototypeOf(Constructor, FunctionModel.prototype);
	return Constructor;
};

Model.Function.prototype = Object.create(Model.prototype);