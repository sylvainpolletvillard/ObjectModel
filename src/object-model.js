Model.Object = function ObjectModel(def){

	var model = function(obj) {
		if(!(this instanceof model)){
			return new model(obj);
		}
		merge(this, obj, true);
		var proxy = getProxy(this, model.definition);
		checkModel(proxy, model.definition);
		matchAssertions(proxy, model.assertions);
		return proxy;
	};

	return initModel(model, ObjectModel, Object.create(Object.prototype), def);
};

Model.Object.prototype = Object.create(Model.prototype);

Model.Object.prototype.defaults = function(p){
	merge(this.prototype, p);
	return this;
};

function getProxy(obj, def, path) {
	if(def instanceof Model.Function){
		return def(obj);
	} else if(isLeaf(def)){
		checkDefinitions(obj, def, path);
		return obj;
	} else {
		var wrapper = obj instanceof Object ? obj : Object.create(null);
		var proxy = Object.create(Object.getPrototypeOf(wrapper));
		Object.keys(def).forEach(function(key) {
			var newPath = (path ? [path,key].join('.') : key);
			var isWritable = (key.toUpperCase() != key);
			Object.defineProperty(proxy, key, {
				get: function () {
					return getProxy(wrapper[key], def[key], newPath);
				},
				set: function (val) {
					if(!isWritable && wrapper[key] !== undefined){
						throw new TypeError("cannot redefine constant "+key);
					}
					var newProxy = getProxy(val, def[key], newPath);
					if(!isLeaf(def[key])){
						checkModel(newProxy, def[key], newPath);
					}
					wrapper[key] = newProxy;
				},
				enumerable: (key[0] !== "_")
			});
		});
		return proxy;
	}
}