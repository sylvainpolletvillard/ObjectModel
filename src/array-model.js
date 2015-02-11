var ARRAY_MUTATOR_METHODS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];

Model.Array = function ArrayModel(def){

	var model = function() {
		var array = cloneArray(arguments);
		if(!(this instanceof model)){
			return new (Function.prototype.bind.apply(model, [null].concat(array)));
		}

		model.validate(array);
		var proxy = this;

		ARRAY_MUTATOR_METHODS.forEach(function (method) {
			Object.defineProperty(proxy, method, { configurable: true, value: function() {
				var testArray = array.slice();
				Array.prototype[method].apply(testArray, arguments);
				model.validate(testArray);
				var newKeys = Object.keys(testArray).filter(function(key){ return !(key in proxy) });
				proxifyKeys(proxy, array, newKeys, model.definition);
				return Array.prototype[method].apply(array, arguments);
			}});
		});

		proxifyKeys(proxy, array, Object.keys(array), model.definition);
		Object.defineProperty(proxy, "length", {
			enumerable: false,
			get: function(){ return array.length; }
		});
		return proxy;
	};

	Object.setPrototypeOf(model, ArrayModel.prototype);
	model.prototype = Object.create(Array.prototype);
	model.prototype.constructor = model;
	model.definition = parseDefinition(def);
	model.assertions = [];
	return model;
};

Model.Array.prototype = Object.create(Model.prototype);

Model.Array.prototype.validate = function(arr){
	if(!isArray(arr)){
		throw new TypeError("expecting an array, got: " + toString(arr));
	}
	for(var i=0, l=arr.length; i<l; i++){
		matchDefinitions(arr[i], this.definition, 'Array['+i+']');
	}
	matchAssertions(arr, this.assertions);
};

Model.Array.prototype.toString = function(ndeep){
	return 'Model.Array(' + toString(this.definition, ndeep) + ')';
};

Model.Array.prototype.extend = function(ext){
	var subModel = new Model.Array(this.definition.concat(parseDefinition(ext)));
	subModel.prototype = Object.create(this.prototype);
	subModel.prototype.constructor = subModel;
	subModel.assertions = cloneArray(this.assertions);
	return subModel;
};

function proxifyKeys(proxy, array, indexes, def){
	indexes.forEach(function(index){
		Object.defineProperty(proxy, index, {
			get: function () {
				return array[index];
			},
			set: function (val) {
				matchDefinitions(val, def, 'Array['+index+']');
				array[index] = val;
			}
		});
	});
}