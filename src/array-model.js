var ARRAY_MUTATOR_METHODS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];

Model.Array = function ArrayModel(def){

	var model = function(array) {

		var proxy;
		model.validate(array);
		if(isProxySupported){
			proxy = new Proxy(array, {
				get: function (arr, key) {
					return (ARRAY_MUTATOR_METHODS.indexOf(key) >= 0 ? proxifyArrayMethod(arr, key, model) : arr[key]);
				},
				set: function (arr, key, val) {
					setArrayKey(arr, key, val, model);
				}
			});
		} else {
			proxy = Object.create(Array.prototype);
			for(var key in array){
				if(array.hasOwnProperty(key)){
					proxifyArrayKey(proxy, array, key, model);
				}
			}
			Object.defineProperty(proxy, "length", { get: function() { return array.length; } });
			ARRAY_MUTATOR_METHODS.forEach(function (method) {
				def(proxy, method, proxifyArrayMethod(array, method, model, proxy));
			});
		}

		setConstructor(proxy, model);
		return proxy;
	};

	setProto(model, Array.prototype);
	setConstructor(model, Model.Array);
	model.definition = def;
	model.assertions = [];
	return model;
};

setProto(Model.Array, Model.prototype, Model);

Model.Array.prototype.toString = function(stack){
	return 'Array of ' + toString(this.definition, stack);
};

// private methods
define(Model.Array.prototype, "validator", function(arr, errorCollector, stack){
	if(!isArray(arr)){
		errorCollector({ expected: [this], received: arr });
	}
	for(var i=0, l=arr.length; i<l; i++){
		checkDefinition(arr[i], this.definition, 'Array['+i+']', stack, errorCollector);
	}
	matchAssertions(arr, this.assertions, errorCollector);
});

function proxifyArrayKey(proxy, array, key, model){
	Object.defineProperty(proxy, key, {
		enumerable: true,
		get: function () {
			return array[key];
		},
		set: function (val) {
			setArrayKey(array, key, val, model);
		}
	});
}

function proxifyArrayMethod(array, method, model, proxy){
	return function() {
		var testArray = array.slice();
		Array.prototype[method].apply(testArray, arguments);
		model.validate(testArray);
		if(!isProxySupported){
			for(var key in testArray){
				if(testArray.hasOwnProperty(key) && !(key in proxy)){
					proxifyArrayKey(proxy, array, key, model);
				}
			}
		}
		return Array.prototype[method].apply(array, arguments);
	};
}

function setArrayKey(array, key, value, model){
	if(parseInt(key) === +key && key >= 0){
		checkDefinition(value, model.definition, 'Array['+key+']', [], model.errorCollector);
	}
	var testArray = array.slice();
	testArray[key] = value;
	matchAssertions(testArray, model.assertions, model.errorCollector);
	array[key] = value;
}