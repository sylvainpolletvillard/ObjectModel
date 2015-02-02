var ARRAY_MUTATOR_METHODS = ["pop", "push", "reverse", "shift", "sort", "splice", "unshift"];

function ArrayModel(itemDef){

	var def = {
		item: itemDef,
		min: 0,
		max: Infinity
	};

	var Constructor = function() {
		if(!(this instanceof Constructor)){
			return new (Function.prototype.bind.apply(Constructor, [null].concat(arrayCopy(arguments))));
		}

		var array = arrayCopy(arguments);
		validateArrayModel(array, def);
		return getArrayProxy(this, array, def);
	};

	Constructor.min = function(val){ def.min = val; return this };
	Constructor.max = function(val){ def.max = val; return this };
	Constructor.extend = function(itemDef){
		var Ext = new ArrayModel([].concat(def.item).concat(itemDef || []));
		Ext.prototype = Object.create(Constructor.prototype);
		Ext.prototype.constructor = Ext;
		return Ext;
	};
	Constructor.isValidModelFor = function(arr){
		try {
			this.apply(null, arr);
			return true;
		}
		catch(e){
			if(e instanceof TypeError){
				return false;
			}
			throw e;
		}
	};
	Constructor.toString = function(ndeep){
		var out= 'ArrayModel('+objToString(itemDef, ndeep)+')';
		if(def.min < 0){
			out += '.min('+def.min+')';
		}
		if(def.max < Infinity){
			out += '.max('+def.max+')';
		}
		return out;
	};

	Constructor.prototype = Object.create(Array.prototype); /* inherits from native array */
	Constructor.prototype.constructor = Constructor;
	Object.setPrototypeOf(Constructor, ArrayModel.prototype);
	return Constructor;
}
ArrayModel.prototype = Object.create(Function.prototype);

function getArrayProxy(proto, array, def){
	var proxy = Object.create(proto);

	ARRAY_MUTATOR_METHODS.forEach(function (method) {
		Object.defineProperty(proxy, method, { configurable: true, value: function() {
			var testArray = array.slice();
			Array.prototype[method].apply(testArray, arguments);
			validateArrayModel(testArray, def);
			var newKeys = Object.keys(testArray).filter(function(key){ return !(key in proxy) });
			proxifyKeys(proxy, array, newKeys, def.item);
			return Array.prototype[method].apply(array, arguments);
		}});
	});

	proxifyKeys(proxy, array, Object.keys(array), def.item);
	Object.defineProperty(proxy, "length", {
		enumerable: false,
		get: function(){ return array.length; }
	});
	return proxy;
}

function proxifyKeys(proxy, array, indexes, itemDef){
	indexes.forEach(function(index){
		Object.defineProperty(proxy, index, {
			get: function () {
				return array[index];
			},
			set: function (val) {
				matchDefinition(val, itemDef, 'Array['+index+']');
				array[index] = val;
			}
		});
	});
}

function validateArrayModel(obj, def, path){
	obj.forEach(function(o, i){
		matchDefinition(o, def.item, 'Array['+i+']');
	});
	if(obj.length < def.min || obj.length > def.max){
		throw new TypeError(
			"expecting "+(path || "Array")+" to have "
		+(def.min === def.max ? def.min : "between" + def.min + " and " + def.max)
		+" items, got "+obj.length
		);
	}
}