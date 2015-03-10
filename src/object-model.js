Model.Object = function ObjectModel(def){

	var model = function(obj) {
		if(!(this instanceof model)){
			return new model(obj);
		}
		merge(this, obj, true);
		var proxy = getProxy(model, this, model.definition);
        model.validate(proxy, []);
		return proxy;
	};

	return initModel(model, ObjectModel, Object.create(Object.prototype), def);
};

Model.Object.prototype = Object.create(Model.prototype);

Model.Object.prototype.defaults = function(p){
	merge(this.prototype, p);
	return this;
};

function getProxy(model, obj, defNode, path) {
	if(defNode instanceof Model.Function){
		return defNode(obj);
	} else if(isLeaf(defNode)){
		//checkDefinitions(obj, defNode, path, []);
		return obj;
	} else {
		var wrapper = obj instanceof Object ? obj : Object.create(null);
		var proxy = Object.create(Object.getPrototypeOf(wrapper));
		Object.keys(defNode).forEach(function(key) {
			var newPath = (path ? [path,key].join('.') : key);
			var isWritable = (key.toUpperCase() != key);
			Object.defineProperty(proxy, key, {
				get: function () {
					return getProxy(model, wrapper[key], defNode[key], newPath);
				},
				set: function (val) {
					if(!isWritable && wrapper[key] !== undefined){
						throw new TypeError("cannot redefine constant "+key);
					}
					var newProxy = getProxy(model, val, defNode[key], newPath);
					checkModel(newProxy, defNode[key], newPath, []);
                    var oldValue = wrapper[key];
					wrapper[key] = newProxy;
                    try { matchAssertions(obj, model.assertions); }
                    catch(e){ wrapper[key] = oldValue; throw e; }
				},
				enumerable: (key[0] !== "_")
			});
		});
		return proxy;
	}
}