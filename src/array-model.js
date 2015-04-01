var ARRAY_MUTATOR_METHODS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];

Model.Array = function ArrayModel(def){

	var model = function() {

		var array = cloneArray(arguments),
			proxy = Object.create(Array.prototype);
		model.validate(array);
		proxifyKeys(proxy, array, Object.keys(array), model);
		Object.defineProperty(proxy, "length", { get: function() { return array.length; } });

		ARRAY_MUTATOR_METHODS.forEach(function (method) {
			Object.defineProperty(proxy, method, { configurable: true, value: function() {
				var testArray = array.slice();
				Array.prototype[method].apply(testArray, arguments);
				model.validate(testArray);
				var newKeys = Object.keys(testArray).filter(function(key){ return !(key in proxy) });
				proxifyKeys(proxy, array, newKeys, model);
				return Array.prototype[method].apply(array, arguments);
			}});
		});

		setConstructor(proxy, model);
		return proxy;
	};

	setProto(model, Object.create(Array.prototype));
	setConstructor(model, ArrayModel);
	model.definition = def;
	model.assertions = [];
	return model;
};

Model.Array.prototype = Object.create(Model.prototype);
Model.Array.prototype.constructor = Model;

Model.Array.prototype.validate = function(arr){
	if(!isArray(arr)){
		throw new TypeError("expecting an array, got: " + toString(arr));
	}
	for(var i=0, l=arr.length; i<l; i++){
		checkDefinition(arr[i], this.definition, 'Array['+i+']', []);
	}
	matchAssertions(arr, this.assertions);
};

Model.Array.prototype.toString = function(ndeep){
	return 'Model.Array(' + toString(this.definition, ndeep) + ')';
};

function proxifyKeys(proxy, array, indexes, model){
	indexes.forEach(function(index){
		Object.defineProperty(proxy, index, {
			get: function () {
				return array[index];
			},
			set: function (val) {
				checkDefinition(val, model.definition, 'Array['+index+']', []);
				var testArray = array.slice();
				testArray[index] = val;
				matchAssertions(testArray, model.assertions);
				array[index] = val;
			}
		});
	});
}