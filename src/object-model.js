Model.Object = function ObjectModel(def){

	var model = function(obj) {
		if(!(this instanceof model)){
			return new model(obj);
		}
		merge(this, obj, true);
		var proxy = getProxy(this, model.definition);
		validateObjectModel(proxy, model.definition);
		return proxy;
	};

	Object.setPrototypeOf(model, ObjectModel.prototype);
	model.constructor = ObjectModel;
	model.prototype = Object.create(Object.prototype);
	model.prototype.constructor = model;
	model.definition = parseDefinition(def);
	model.assertions = [];
	return model;
};

Model.Object.prototype = Object.create(Model.prototype);

Model.Object.prototype.validate = function(obj){
	validateObjectModel(obj, this.definition);
	matchAssertions(obj, this.assertions);
};

Model.Object.prototype.extend = function(extendedDefinition){
	var submodel = new Model.Object(merge(extendedDefinition || {}, this.definition));
	submodel.prototype = Object.create(this.prototype);
	submodel.prototype.constructor = submodel;
	submodel.assertions = cloneArray(this.assertions);
	return submodel;
};

Model.Object.prototype.defaults = function(p){
	merge(this.prototype, p);
	return this;
};

function validateObjectModel(obj, def, path){
	if(isLeaf(def)){
		matchDefinitions(obj, def, path);
	} else {
		Object.keys(def).forEach(function(key) {
			var newPath = (path ? [path,key].join('.') : key);
			validateObjectModel(obj instanceof Object ? obj[key] : undefined, def[key], newPath);
		});
	}
}

function getProxy(obj, def, path) {
	if(def instanceof Model.Function){
		return def(obj);
	} else if(isLeaf(def)){
		matchDefinitions(obj, def, path);
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
						validateObjectModel(newProxy, def[key], newPath);
					}
					wrapper[key] = newProxy;
				},
				enumerable: (key[0] !== "_")
			});
		});
		return proxy;
	}
}