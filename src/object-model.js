Model.Object = function(def, proto){

	var Constructor = function(obj) {
		if(!(this instanceof Constructor)){
			return new Constructor(obj);
		}
		merge(this, obj, true);
		var proxy = getProxy(this, def);
		validateModel(proxy, def);
		return proxy;
	};

	Constructor.extend = function(ext){
		return new Model.Object(merge(ext || {}, def), Constructor.prototype);
	};
	Constructor.defaults = function(p){
		merge(Constructor.prototype, p);
		return this;
	};

	Constructor.toString = toString.bind(this, def);
	Constructor.prototype = Object.create(proto || Object.prototype);
	Constructor.prototype.constructor = Constructor;
	Object.setPrototypeOf(Constructor, Model.Object.prototype);
	return Constructor;
};

Model.Object.prototype = Object.create(Model.prototype);

function getProxy(obj, def, path) {
	if(def instanceof Model.Function){
		return def(obj);
	} else if(isLeaf(def)){
		matchDefinition(obj, def, path);
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
						validateModel(newProxy, def[key], newPath);
					}
					wrapper[key] = newProxy;
				},
				enumerable: (key[0] !== "_")
			});
		});
		return proxy;
	}
}