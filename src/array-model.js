Model[ARRAY] = function ArrayModel(def){

	var model = function(array) {
		array = defaultTo(model[DEFAULT], array);

		var proxy;
		model[VALIDATE](array);
		if(isProxySupported){
			proxy = new Proxy(array, {
				get: function (arr, key) {
					if(key === CONSTRUCTOR){
						return model;
					} else if(ARRAY_MUTATOR_METHODS.indexOf(key) >= 0){
						return proxifyArrayMethod(arr, key, model);
					}
					return arr[key];
				},
				set: function (arr, key, val) {
					setArrayKey(arr, key, val, model);
				},
				getPrototypeOf: function(){
					return model[PROTO];
				}
			});
		} else {
			proxy = Object.create(Array[PROTO]);
			for(var key in array){
				if(array.hasOwnProperty(key)){
					proxifyArrayKey(proxy, array, key, model);
				}
			}
			defineProperty(proxy, "length", { get: function() { return array.length; } });
			defineProperty(proxy, "toJSON", { value: function() { return array; } });
			ARRAY_MUTATOR_METHODS.forEach(function (method) {
				define(proxy, method, proxifyArrayMethod(array, method, model, proxy));
			});
			setConstructor(proxy, model);
		}

		return proxy;
	};

	setConstructorProto(model, Array[PROTO]);
	initModel(model, def, Model[ARRAY]);
	return model;
};

setConstructorProto(Model[ARRAY], Model[PROTO]);
var ArrayModelProto = Model[ARRAY][PROTO];

ArrayModelProto.toString = function(stack){
	return ARRAY + ' of ' + toString(this[DEFINITION], stack);
};

// private methods
define(ArrayModelProto, VALIDATOR, function(arr, path, callStack, errorStack){
	if(!is(Array, arr)){
		var err = {};
		err[EXPECTED] = this;
		err[RECEIVED] = arr;
		err[PATH] = path;
		errorStack.push(err);
	} else {
		for(var i=0, l=arr.length; i<l; i++){
			checkDefinition(arr[i], this[DEFINITION], (path||ARRAY)+'['+i+']', callStack, errorStack);
		}
	}
	checkAssertions(arr, this);
});

function proxifyArrayKey(proxy, array, key, model){
	defineProperty(proxy, key, {
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
		Array[PROTO][method].apply(testArray, arguments);
		model[VALIDATE](testArray);
		if(!isProxySupported){
			for(var key in testArray){
				if(testArray.hasOwnProperty(key) && !(key in proxy)){
					proxifyArrayKey(proxy, array, key, model);
				}
			}
		}
		return Array[PROTO][method].apply(array, arguments);
	};
}

function setArrayKey(array, key, value, model){
	if(parseInt(key) === +key && key >= 0){
		checkDefinition(value, model[DEFINITION], ARRAY+'['+key+']', [], model[ERROR_STACK]);
	}
	var testArray = array.slice();
	testArray[key] = value;
	checkAssertions(testArray, model);
	model[UNSTACK]();
	array[key] = value;
}